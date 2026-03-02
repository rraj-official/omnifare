import { NextRequest, NextResponse } from "next/server";
import { getCalendarForPOS, type CalendarDay } from "@/lib/flightApiService";

// ── Airport → Country ────────────────────────────────────────

const AIRPORT_COUNTRY: Record<string, string> = {
  LHR: "GB", LGW: "GB", DEL: "IN", BOM: "IN", BLR: "IN", JFK: "US",
  LAX: "US", DXB: "AE", SIN: "SG", IST: "TR", NRT: "JP", HND: "JP",
  CDG: "FR", FRA: "DE", BKK: "TH", SYD: "AU", HKG: "HK", ICN: "KR",
  GRU: "BR", CAI: "EG", EZE: "AR", HAN: "VN", SGN: "VN", KUL: "MY",
  GOI: "IN", MAA: "IN", HYD: "IN", CCU: "IN", MIA: "US", ORD: "US",
};

function countryForAirport(iata: string): string {
  return AIRPORT_COUNTRY[iata.toUpperCase()] ?? "US";
}

// ── Mock calendar generator (when no API key) ────────────────

function generateMockCalendar(
  baseDate: string, posCountry: string,
): CalendarDay[] {
  const start = new Date(baseDate);
  start.setDate(1);
  const days: CalendarDay[] = [];

  const discounts: Record<string, number> = {
    TR: 0.85, EG: 0.83, AR: 0.80, VN: 0.88, IN: 0.92, BR: 0.87,
    US: 1.0, GB: 0.98, JP: 1.02, AE: 0.96,
  };
  const mult = discounts[posCountry] ?? 0.95;

  for (let d = 0; d < 30; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

    const base = isWeekend ? 520 : 420;
    const variance = Math.sin(d * 0.7) * 60;
    const price = Math.round((base + variance) * mult);

    days.push({
      date: date.toISOString().slice(0, 10),
      price: price > 0 ? price : null,
    });
  }
  return days;
}

// ── Overlay logic: merge origin + dest calendars ─────────────

interface OverlayDay {
  date: string;
  origin_pos_price: number | null;
  dest_pos_price: number | null;
  cheapest_price: number | null;
  cheapest_pos: string | null;
  is_geoarb_opportunity: boolean;
}

function overlayCalendars(
  originResult: { posCountry: string; days: CalendarDay[] },
  destResult: { posCountry: string; days: CalendarDay[] },
): OverlayDay[] {
  const destMap = new Map(destResult.days.map((d) => [d.date, d.price]));

  return originResult.days.map((day) => {
    const destPrice = destMap.get(day.date) ?? null;
    const originPrice = day.price;

    let cheapestPrice: number | null = null;
    let cheapestPos: string | null = null;
    let isOpportunity = false;

    if (originPrice !== null && destPrice !== null) {
      if (destPrice < originPrice) {
        cheapestPrice = destPrice;
        cheapestPos = destResult.posCountry;
        isOpportunity = true;
      } else {
        cheapestPrice = originPrice;
        cheapestPos = originResult.posCountry;
      }
    } else if (originPrice !== null) {
      cheapestPrice = originPrice;
      cheapestPos = originResult.posCountry;
    } else if (destPrice !== null) {
      cheapestPrice = destPrice;
      cheapestPos = destResult.posCountry;
    }

    return {
      date: day.date,
      origin_pos_price: originPrice,
      dest_pos_price: destPrice,
      cheapest_price: cheapestPrice,
      cheapest_pos: cheapestPos,
      is_geoarb_opportunity: isOpportunity,
    };
  });
}

// ── Route handler ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      origin, destination, currency = "USD",
      date = new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    } = body;

    if (!origin || !destination) {
      return NextResponse.json(
        { error: "Missing required fields", required: ["origin", "destination"] },
        { status: 400 },
      );
    }

    const originCC = countryForAirport(origin);
    const destCC = countryForAirport(destination);
    const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
    const hasApiKey = !!process.env.RAPIDAPI_KEY;

    let originCal: { posCountry: string; days: CalendarDay[] };
    let destCal: { posCountry: string; days: CalendarDay[] };
    let source: "live" | "mock" = "mock";

    if (!useMock && hasApiKey) {
      source = "live";
      const [oRes, dRes] = await Promise.all([
        getCalendarForPOS({ departureId: origin, arrivalId: destination, outboundDate: date, countryCode: originCC, currency }).catch(() => null),
        getCalendarForPOS({ departureId: origin, arrivalId: destination, outboundDate: date, countryCode: destCC, currency }).catch(() => null),
      ]);

      originCal = oRes ?? { posCountry: originCC, days: generateMockCalendar(date, originCC) };
      destCal = dRes ?? { posCountry: destCC, days: generateMockCalendar(date, destCC) };
    } else {
      originCal = { posCountry: originCC, days: generateMockCalendar(date, originCC) };
      destCal = { posCountry: destCC, days: generateMockCalendar(date, destCC) };
    }

    const overlay = overlayCalendars(originCal, destCal);
    const opportunities = overlay.filter((d) => d.is_geoarb_opportunity).length;

    return NextResponse.json({
      source,
      origin_pos: originCC,
      dest_pos: destCC,
      currency: currency.toUpperCase(),
      days: overlay,
      stats: {
        total_days: overlay.length,
        geoarb_opportunities: opportunities,
        cheapest_day: overlay.reduce<OverlayDay | null>(
          (best, d) => (!best || (d.cheapest_price !== null && (best.cheapest_price === null || d.cheapest_price < best.cheapest_price))) ? d : best,
          null,
        ),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Calendar request failed", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 },
    );
  }
}
