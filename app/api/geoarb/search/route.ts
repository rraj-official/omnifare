import { NextRequest, NextResponse } from "next/server";
export const maxDuration = 60;
import { getPriorityPOS } from "@/lib/geoArbEngine";
import { convert, currencyForCountry } from "@/lib/exchangeRate";
import { isValidCurrency } from "@/lib/apiConstants";
import {
  fetchAllPOS,
  mergeFlightsBySignature,
  type MergedFlight,
  type POSFetchResult,
} from "@/lib/flightApiService";

// ── Airport → Country mapping ────────────────────────────────

const AIRPORT_COUNTRY: Record<string, string> = {
  // India
  DEL: "IN", BOM: "IN", BLR: "IN", MAA: "IN", HYD: "IN", CCU: "IN", GOI: "IN", AMD: "IN", PNQ: "IN", COK: "IN",
  // Middle East
  DXB: "AE", AUH: "AE", DOH: "QA", IST: "TR", SAW: "TR", JED: "SA", RUH: "SA", CAI: "EG",
  // Asia Pacific
  SIN: "SG", KUL: "MY", BKK: "TH", HKG: "HK", NRT: "JP", HND: "JP", ICN: "KR", TPE: "TW", SGN: "VN", HAN: "VN", CGK: "ID", SYD: "AU", MEL: "AU", AKL: "NZ",
  // Europe
  LHR: "GB", LGW: "GB", CDG: "FR", FRA: "DE", MUC: "DE", AMS: "NL", MAD: "ES", BCN: "ES", FCO: "IT", MXP: "IT", ZRH: "CH",
  // North America
  JFK: "US", EWR: "US", LAX: "US", SFO: "US", ORD: "US", DFW: "US", ATL: "US", MIA: "US", YYZ: "CA", YVR: "CA",
  // Latin America
  GRU: "BR", GIG: "BR", EZE: "AR", BOG: "CO", MEX: "MX", SCL: "CL",
  // Africa
  JNB: "ZA", CPT: "ZA", LOS: "NG", ADD: "ET", NBO: "KE",
};

// ── Country info ─────────────────────────────────────────────

const COUNTRY_INFO: Record<string, { name: string; emoji: string }> = {
  AF: { name: "Afghanistan", emoji: "🇦🇫" },
  AL: { name: "Albania", emoji: "🇦🇱" },
  DZ: { name: "Algeria", emoji: "🇩🇿" },
  AR: { name: "Argentina", emoji: "🇦🇷" },
  AU: { name: "Australia", emoji: "🇦🇺" },
  AT: { name: "Austria", emoji: "🇦🇹" },
  BD: { name: "Bangladesh", emoji: "🇧🇩" },
  BE: { name: "Belgium", emoji: "🇧🇪" },
  BR: { name: "Brazil", emoji: "🇧🇷" },
  BG: { name: "Bulgaria", emoji: "🇧🇬" },
  CA: { name: "Canada", emoji: "🇨🇦" },
  CL: { name: "Chile", emoji: "🇨🇱" },
  CN: { name: "China", emoji: "🇨🇳" },
  CO: { name: "Colombia", emoji: "🇨🇴" },
  HR: { name: "Croatia", emoji: "🇭🇷" },
  CZ: { name: "Czech Republic", emoji: "🇨🇿" },
  DK: { name: "Denmark", emoji: "🇩🇰" },
  EG: { name: "Egypt", emoji: "🇪🇬" },
  FI: { name: "Finland", emoji: "🇫🇮" },
  FR: { name: "France", emoji: "🇫🇷" },
  DE: { name: "Germany", emoji: "🇩🇪" },
  GH: { name: "Ghana", emoji: "🇬🇭" },
  GR: { name: "Greece", emoji: "🇬🇷" },
  HK: { name: "Hong Kong", emoji: "🇭🇰" },
  HU: { name: "Hungary", emoji: "🇭🇺" },
  IN: { name: "India", emoji: "🇮🇳" },
  ID: { name: "Indonesia", emoji: "🇮🇩" },
  IE: { name: "Ireland", emoji: "🇮🇪" },
  IL: { name: "Israel", emoji: "🇮🇱" },
  IT: { name: "Italy", emoji: "🇮🇹" },
  JP: { name: "Japan", emoji: "🇯🇵" },
  JO: { name: "Jordan", emoji: "🇯🇴" },
  KZ: { name: "Kazakhstan", emoji: "🇰🇿" },
  KE: { name: "Kenya", emoji: "🇰🇪" },
  KW: { name: "Kuwait", emoji: "🇰🇼" },
  LB: { name: "Lebanon", emoji: "🇱🇧" },
  MY: { name: "Malaysia", emoji: "🇲🇾" },
  MX: { name: "Mexico", emoji: "🇲🇽" },
  MA: { name: "Morocco", emoji: "🇲🇦" },
  NL: { name: "Netherlands", emoji: "🇳🇱" },
  NZ: { name: "New Zealand", emoji: "🇳🇿" },
  NG: { name: "Nigeria", emoji: "🇳🇬" },
  NO: { name: "Norway", emoji: "🇳🇴" },
  PK: { name: "Pakistan", emoji: "🇵🇰" },
  PE: { name: "Peru", emoji: "🇵🇪" },
  PH: { name: "Philippines", emoji: "🇵🇭" },
  PL: { name: "Poland", emoji: "🇵🇱" },
  PT: { name: "Portugal", emoji: "🇵🇹" },
  QA: { name: "Qatar", emoji: "🇶🇦" },
  RO: { name: "Romania", emoji: "🇷🇴" },
  RU: { name: "Russia", emoji: "🇷🇺" },
  SA: { name: "Saudi Arabia", emoji: "🇸🇦" },
  SG: { name: "Singapore", emoji: "🇸🇬" },
  ZA: { name: "South Africa", emoji: "🇿🇦" },
  KR: { name: "South Korea", emoji: "🇰🇷" },
  ES: { name: "Spain", emoji: "🇪🇸" },
  LK: { name: "Sri Lanka", emoji: "🇱🇰" },
  SE: { name: "Sweden", emoji: "🇸🇪" },
  CH: { name: "Switzerland", emoji: "🇨🇭" },
  TW: { name: "Taiwan", emoji: "🇹🇼" },
  TH: { name: "Thailand", emoji: "🇹🇭" },
  TR: { name: "Turkey", emoji: "🇹🇷" },
  UA: { name: "Ukraine", emoji: "🇺🇦" },
  AE: { name: "UAE", emoji: "🇦🇪" },
  GB: { name: "United Kingdom", emoji: "🇬🇧" },
  US: { name: "United States", emoji: "🇺🇸" },
  UY: { name: "Uruguay", emoji: "🇺🇾" },
  UZ: { name: "Uzbekistan", emoji: "🇺🇿" },
  VN: { name: "Vietnam", emoji: "🇻🇳" },
  ZM: { name: "Zambia", emoji: "🇿🇲" },
  ZW: { name: "Zimbabwe", emoji: "🇿🇼" },
};

// ── Per-country popular OTA ──────────────────────────────────

const COUNTRY_OTA: Record<string, { name: string; website: string }> = {
  IN: { name: "MakeMyTrip", website: "https://www.makemytrip.com" },
  US: { name: "Expedia", website: "https://www.expedia.com" },
  GB: { name: "Skyscanner", website: "https://www.skyscanner.net" },
  TR: { name: "Enuygun", website: "https://www.enuygun.com" },
  BR: { name: "Decolar", website: "https://www.decolar.com" },
  DE: { name: "Kayak.de", website: "https://www.kayak.de" },
  FR: { name: "Kayak.fr", website: "https://www.kayak.fr" },
  AE: { name: "Musafir", website: "https://www.musafir.com" },
  SG: { name: "Trip.com", website: "https://www.trip.com" },
  JP: { name: "Jalan", website: "https://www.jalan.net" },
  AR: { name: "Despegar", website: "https://www.despegar.com.ar" },
  EG: { name: "Almosafer", website: "https://www.almosafer.com" },
  VN: { name: "Traveloka", website: "https://www.traveloka.com" },
  MY: { name: "AirAsia", website: "https://www.airasia.com" },
  HK: { name: "Trip.com HK", website: "https://www.trip.com" },
  TH: { name: "Traveloka", website: "https://www.traveloka.com" },
  AU: { name: "Webjet", website: "https://www.webjet.com.au" },
  CA: { name: "Flighthub", website: "https://www.flighthub.com" },
  KR: { name: "Interpark", website: "https://flights.interpark.com" },
  SA: { name: "Almosafer", website: "https://www.almosafer.com" },
  QA: { name: "Almosafer", website: "https://www.almosafer.com" },
  ZA: { name: "FlightSite", website: "https://www.flightsite.co.za" },
  ID: { name: "Traveloka ID", website: "https://www.traveloka.com" },
  PH: { name: "Traveloka PH", website: "https://www.traveloka.com" },
  PL: { name: "Wakacje.pl", website: "https://www.wakacje.pl" },
  RU: { name: "Aviasales", website: "https://www.aviasales.ru" },
  UA: { name: "Kiwi.com", website: "https://www.kiwi.com" },
  MX: { name: "eDreams MX", website: "https://www.edreams.com.mx" },
  NL: { name: "Vliegtickets", website: "https://www.vliegtickets.nl" },
  IT: { name: "eDreams IT", website: "https://www.edreams.it" },
  ES: { name: "eDreams ES", website: "https://www.edreams.es" },
};

function getCountryOTA(cc: string) {
  return COUNTRY_OTA[cc.toUpperCase()] ?? { name: "CheapFlights", website: "https://www.cheapflights.com" };
}

function getCountryInfo(cc: string) {
  return COUNTRY_INFO[cc.toUpperCase()] ?? { name: cc, emoji: "🌐" };
}

// ── Helpers ──────────────────────────────────────────────────

function countryForAirport(iata: string): string {
  return AIRPORT_COUNTRY[iata.toUpperCase()] ?? "US";
}

function buildSearchKey(
  origin: string, destination: string, date: string,
  cabinClass = "economy", passengers = 1,
): string {
  return `${origin}_${destination}_${date}_${cabinClass}_${passengers}`.toLowerCase();
}

function riskLevel(cc: string): "low" | "medium" {
  const mediumRisk = new Set(["AR", "EG", "VN", "NG", "PK", "BD"]);
  return mediumRisk.has(cc.toUpperCase()) ? "medium" : "low";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ── Apply FX + bank fee to merged flights ────────────────────

async function applyPricing(merged: MergedFlight[], userCcy: string) {
  return Promise.all(merged.map(async (f) => {
    const posOptions = await Promise.all(
      f.posOptions.map(async (opt) => {
        const posCcy = currencyForCountry(opt.country);
        let price: number;
        let fxRate: number;

        if (userCcy === "USD") {
          price = opt.priceUsd; fxRate = 1;
        } else {
          const cx = await convert(opt.priceUsd, "USD", userCcy, 0);
          price = cx.converted; fxRate = cx.rate;
        }

        const bankFee = posCcy !== userCcy ? round2(price * 0.03) : 0;
        const total = round2(price + bankFee);
        const cc = opt.country.toUpperCase();
        const countryInfo = getCountryInfo(cc);
        const ota = getCountryOTA(cc);

        return {
          country: cc,
          country_name: countryInfo.name,
          flag_emoji: countryInfo.emoji,
          provider: ota.name,
          provider_website: ota.website,
          local_price_usd: opt.priceUsd,
          converted_price: price,
          bank_fee: bankFee,
          total,
          fx_rate: fxRate,
          risk_level: riskLevel(cc),
          booking_token: opt.bookingToken,
        };
      })
    );

    const validPosOptions = posOptions.filter((o) => o.converted_price > 0 && o.total > 0);
    validPosOptions.sort((a, b) => a.total - b.total);
    const cheapest = validPosOptions[0];

    return {
      signature: f.signature,
      airline: f.airline,
      airline_logo: f.airlineLogo,
      legs: f.legs,
      total_duration_minutes: f.totalDurationMinutes,
      stops: f.stops,
      co2_kg: f.co2Kg,
      cheapest_total: cheapest?.total ?? 0,
      cheapest_pos: cheapest?.country ?? "",
      user_currency: userCcy,
      pos_options: validPosOptions,
    };
  }));
}

// ── Supabase cache helpers ───────────────────────────────────

async function getCache(searchKey: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key);
  const { data } = await sb
    .from("flight_cache")
    .select("merged_data, created_at")
    .eq("search_key", searchKey)
    .maybeSingle();
  return data;
}

async function setCache(searchKey: string, mergedData: unknown) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svcKey) return;

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(url, svcKey, { auth: { persistSession: false } });
    await sb.from("flight_cache").upsert(
      { search_key: searchKey, merged_data: mergedData, created_at: new Date().toISOString() },
      { onConflict: "search_key" },
    );
  } catch (err) {
    console.warn("[OmniFare] Cache write failed:", err);
  }
}

// ── Main route handler ───────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    let body: { origin?: string; destination?: string; date?: string; cabin_class?: string; passengers?: number; user_currency?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON with origin, destination, date." },
        { status: 400 },
      );
    }
    const {
      origin, destination, date,
      cabin_class, passengers,
      user_currency = "USD",
    } = body;

    if (!origin || !destination || !date) {
      return NextResponse.json(
        { error: "Missing required fields", required: ["origin", "destination", "date"] },
        { status: 400 },
      );
    }

    const searchKey = buildSearchKey(origin, destination, date, cabin_class, passengers);
    const userCcy = user_currency.toUpperCase();

    if (!isValidCurrency(userCcy)) {
      return NextResponse.json(
        { error: `Unsupported currency: ${userCcy}` },
        { status: 400 },
      );
    }

    // ── 0. Mock data mode ──────────────────────────────────
    const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
    if (useMock) {
      console.log("[OmniFare] NEXT_PUBLIC_USE_MOCK_DATA=true — returning mock flights");
      const { mockFlights } = await import("@/lib/mockFlights");
      const flights = mockFlights.map((f) => ({
        signature: f.id,
        airline: f.airline,
        airline_logo: f.airlineLogo,
        legs: f.legs.map((l) => ({
          departureTime: l.departureTime,
          arrivalTime: l.arrivalTime,
          departureAirport: l.departureAirport,
          departureCode: l.departureCode,
          arrivalAirport: l.arrivalAirport,
          arrivalCode: l.arrivalCode,
          durationMinutes: 0,
          aircraft: "",
          flightNumber: l.flightNumber ?? "",
        })),
        total_duration_minutes: 0,
        stops: f.stops,
        co2_kg: f.co2Emissions,
        cheapest_total: f.posOptions[0]?.price ?? 0,
        cheapest_pos: f.posOptions[0]?.countryCode ?? "",
        user_currency: userCcy,
        pos_options: f.posOptions.map((opt) => ({
          country: opt.countryCode,
          country_name: opt.countryName,
          flag_emoji: opt.flagEmoji,
          provider: opt.provider,
          provider_website: opt.providerWebsite ?? "",
          local_price_usd: opt.price * 0.012,
          converted_price: opt.price,
          bank_fee: 0,
          total: opt.price,
          fx_rate: 1,
          risk_level: opt.riskLevel,
          booking_token: opt.bookingToken ?? null,
        })),
      }));
      return NextResponse.json({
        cache: "mock", source: "mock", engine: "mock",
        user_currency: userCcy, flights,
      });
    }

    // ── 0b. Require API key — no mock fallback ──────────────
    if (!process.env.RAPIDAPI_KEY) {
      console.error("[OmniFare] RAPIDAPI_KEY is not set. Cannot perform live search.");
      return NextResponse.json(
        { error: "Flight search service is not configured (RAPIDAPI_KEY missing)." },
        { status: 503 },
      );
    }

    // ── 1. Check cache ──────────────────────────────────────
    const cached = await getCache(searchKey);
    if (cached) {
      const ageMin = Math.round((Date.now() - new Date(cached.created_at).getTime()) / 60_000);
      console.log(`[OmniFare] Cache HIT for ${searchKey} (age: ${ageMin}m)`);
      return NextResponse.json({
        cache: "hit", search_key: searchKey,
        cache_age_minutes: ageMin, flights: cached.merged_data,
      });
    }

    // ── 2. GeoArb plan ──────────────────────────────────────
    const fromCC = countryForAirport(origin);
    const toCC = countryForAirport(destination);
    const plan = getPriorityPOS(fromCC, toCC);
    console.log(`[OmniFare] Search ${origin}→${destination} on ${date} | POS plan: ${plan.countries.join(", ")}`);

    // ── 3. Live API calls (parallel, with per-POS error handling) ──
    const { results: posResults, rateLimited } = await fetchAllPOS({
      departureId: origin,
      arrivalId: destination,
      outboundDate: date,
      countries: plan.countries,
      currency: "USD",
    });

    // Log per-POS results + token coverage
    for (const r of posResults) {
      if (r.error) {
        console.error(`[OmniFare] POS ${r.country} FAILED (${r.latencyMs}ms): ${r.error}`);
      } else {
        const withToken = r.flights.filter((f) => f.bookingToken).length;
        console.log(`[OmniFare] POS ${r.country} OK — ${r.flights.length} flights, ${withToken} with booking token (${r.latencyMs}ms)`);
      }
    }

    // Circuit breaker: if rate-limited, try cache even if stale
    if (rateLimited) {
      console.warn("[OmniFare] Rate limited! Attempting stale cache fallback.");
      const stale = await getCache(searchKey);
      if (stale) {
        return NextResponse.json({
          cache: "stale_fallback", search_key: searchKey,
          message: "Rate limited — returning stale cache",
          flights: stale.merged_data,
        });
      }
      return NextResponse.json(
        { error: "Rate limit reached and no cached results available. Please try again shortly." },
        { status: 429 },
      );
    }

    // ── 4. Merge + deduplicate ──────────────────────────────
    const successfulPOS = posResults.filter((r) => r.flights.length > 0);
    const failedPOS = posResults.filter((r) => r.error !== null);
    const merged = mergeFlightsBySignature(successfulPOS);

    if (merged.length === 0) {
      console.warn(`[OmniFare] No flights returned for ${origin}→${destination}. Failed POS: ${failedPOS.map(f => f.country).join(", ")}`);
      return NextResponse.json(
        {
          error: "No flights found for this route and date.",
          pos_stats: {
            total: plan.countries.length,
            succeeded: successfulPOS.length,
            failed: failedPOS.length,
            failed_countries: failedPOS.map((f) => ({ country: f.country, reason: f.error })),
          },
        },
        { status: 404 },
      );
    }

    // ── 5. Apply FX + bank fee ──────────────────────────────
    const pricedAll = await applyPricing(merged, userCcy);
    const pricedFlights = pricedAll.filter((f) => f.cheapest_total > 0);
    pricedFlights.sort((a, b) => a.cheapest_total - b.cheapest_total);
    const posWithToken = pricedFlights.reduce((n, f) => n + f.pos_options.filter((o: any) => o.booking_token).length, 0);
    const posTotal = pricedFlights.reduce((n, f) => n + f.pos_options.length, 0);
    console.log(`[OmniFare] Returning ${pricedFlights.length} merged flights for ${origin}→${destination} (filtered ${pricedAll.length - pricedFlights.length} zero-price) | booking tokens: ${posWithToken}/${posTotal} POS options`);

    // ── 6. Write to cache (async, non-blocking) ─────────────
    setCache(searchKey, pricedFlights);

    return NextResponse.json({
      cache: "miss",
      search_key: searchKey,
      engine: "GeoArb v3",
      source: "live",
      pos_plan: plan,
      pos_stats: {
        total: plan.countries.length,
        succeeded: successfulPOS.length,
        failed: failedPOS.length,
        failed_countries: failedPOS.map((f) => ({ country: f.country, reason: f.error })),
        rate_limited: rateLimited,
      },
      user_currency: userCcy,
      flights: pricedFlights,
    });
  } catch (err) {
    console.error("[OmniFare] Search route unhandled error:", err);
    return NextResponse.json(
      { error: "Request processing failed", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 },
    );
  }
}
