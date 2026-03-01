/**
 * Flight API Service — DataCrawler Google Flights 2 Integration
 *
 * Endpoints (all GET):
 *   - searchFlights:      /api/v1/searchFlights
 *   - getCalendarPicker:  /api/v1/getCalendarPicker
 *   - getBookingDetails:  /api/v1/getBookingDetails
 *   - getBookingURL:      /api/v1/getBookingURL
 *
 * Each call is POS-aware: country_code is injected per GeoArb plan.
 */

import { isValidCountry, isValidCurrency } from "./apiConstants";

const API_HOST = "google-flights2.p.rapidapi.com";
const API_BASE = `https://${API_HOST}/api/v1`;

function getApiKey(): string {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error("RAPIDAPI_KEY not set in environment");
  return key;
}

function apiHeaders(): Record<string, string> {
  return {
    "x-rapidapi-key": getApiKey(),
    "x-rapidapi-host": API_HOST,
  };
}

// ── API response types ───────────────────────────────────────

interface ApiLeg {
  airline?: string;
  airline_logo?: string;
  flight_number?: string;
  departure_airport?: { airport_name?: string; airport_code?: string; time?: string };
  arrival_airport?: { airport_name?: string; airport_code?: string; time?: string };
  duration_label?: string;
  duration?: number;
  aircraft?: string;
  seat?: string;
  legroom?: string;
  extensions?: string[];
}

interface ApiFlightResult {
  departure_time?: string;
  arrival_time?: string;
  duration?: { raw?: number; text?: string };
  flights?: ApiLeg[];
  layovers?: { airport_code?: string; airport_name?: string; duration_label?: string; duration?: number; city?: string }[] | null;
  price?: number;
  stops?: number;
  airline_logo?: string;
  next_token?: string;
  booking_token?: string;
  carbon_emissions?: { CO2e?: number; typical_for_this_route?: number; difference_percent?: number };
}

interface ApiSearchResponse {
  status?: boolean;
  message?: string;
  data?: {
    // search_type=best returns topFlights/otherFlights at data level
    topFlights?: ApiFlightResult[];
    otherFlights?: ApiFlightResult[];
    // search_type=cheap nests them under data.itineraries
    itineraries?: {
      topFlights?: ApiFlightResult[];
      otherFlights?: ApiFlightResult[];
    };
  };
}

// ── Normalised flight model ──────────────────────────────────

export interface NormalisedLeg {
  airline: string;
  airlineLogo: string;
  flightNumber: string;
  departureAirport: string;
  departureCode: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalCode: string;
  arrivalTime: string;
  durationMinutes: number;
  aircraft: string;
}

export interface NormalisedFlight {
  signature: string;
  airline: string;
  airlineLogo: string;
  legs: NormalisedLeg[];
  totalDurationMinutes: number;
  stops: number;
  co2Kg: number | null;
  posCountry: string;
  priceUsd: number;
  bookingToken: string | null;
}

export interface CalendarDay {
  date: string;
  price: number | null;
}

export interface CalendarResult {
  posCountry: string;
  days: CalendarDay[];
}

// ── searchFlights (GET) ──────────────────────────────────────

export async function searchFlightsForPOS(params: {
  departureId: string;
  arrivalId: string;
  outboundDate: string;
  countryCode: string;
  currency?: string;
  cabinClass?: string;
  adults?: number;
}): Promise<NormalisedFlight[]> {
  const {
    departureId, arrivalId, outboundDate, countryCode,
    currency = "USD", cabinClass = "ECONOMY", adults = 1,
  } = params;

  const cc = countryCode.toUpperCase();
  const ccy = currency.toUpperCase();

  if (!isValidCountry(cc)) {
    throw new Error(`Unsupported country_code: ${cc}`);
  }
  if (!isValidCurrency(ccy)) {
    throw new Error(`Unsupported currency: ${ccy}`);
  }

  const qs = new URLSearchParams({
    departure_id: departureId.toUpperCase(),
    arrival_id: arrivalId.toUpperCase(),
    outbound_date: outboundDate,
    currency: ccy,
    country_code: cc,
    search_type: "cheap",
    travel_class: cabinClass.toUpperCase(),
    adults: String(adults),
    show_hidden: "1",
    language_code: "en-US",
  });

  const res = await fetch(`${API_BASE}/searchFlights?${qs}`, {
    method: "GET",
    headers: apiHeaders(),
    signal: AbortSignal.timeout(30_000),
  });

  if (res.status === 429) {
    const err = new Error("RapidAPI rate limit (429)");
    (err as any).status = 429;
    throw err;
  }

  if (!res.ok) {
    throw new Error(`searchFlights ${countryCode}: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as ApiSearchResponse;

  if (json.status === false) {
    throw new Error(`searchFlights ${countryCode}: API returned status=false — ${JSON.stringify(json.message)}`);
  }

  // Handle both response shapes: direct topFlights/otherFlights (best)
  // or nested under itineraries (cheap)
  const d = json?.data;
  const top = d?.topFlights ?? d?.itineraries?.topFlights ?? [];
  const other = d?.otherFlights ?? d?.itineraries?.otherFlights ?? [];
  const all = [...top, ...other];

  return all.map((it) => normalise(it, countryCode));
}

function normalise(it: ApiFlightResult, posCountry: string): NormalisedFlight {
  const legs: NormalisedLeg[] = (it.flights ?? []).map((f) => ({
    airline: f.airline ?? "Unknown",
    airlineLogo: f.airline_logo ?? "",
    flightNumber: f.flight_number ?? "",
    departureAirport: f.departure_airport?.airport_name ?? "",
    departureCode: f.departure_airport?.airport_code ?? "",
    departureTime: f.departure_airport?.time ?? "",
    arrivalAirport: f.arrival_airport?.airport_name ?? "",
    arrivalCode: f.arrival_airport?.airport_code ?? "",
    arrivalTime: f.arrival_airport?.time ?? "",
    durationMinutes: f.duration ?? 0,
    aircraft: f.aircraft ?? "",
  }));

  const firstLeg = legs[0];

  // Signature for dedup: Airline + FlightNumber + DepartureTime (date+hour level)
  const sig = [
    firstLeg?.flightNumber || firstLeg?.airline || "X",
    firstLeg?.departureTime?.slice(0, 16) ?? "X",
  ].join("|");

  const co2Raw = it.carbon_emissions?.CO2e;

  return {
    signature: sig,
    airline: firstLeg?.airline ?? it.airline_logo?.split("/").pop()?.split(".")[0] ?? "Unknown",
    airlineLogo: it.airline_logo ?? firstLeg?.airlineLogo ?? "",
    legs,
    totalDurationMinutes: it.duration?.raw ?? 0,
    stops: Math.max(0, legs.length - 1),
    co2Kg: co2Raw != null ? Math.round(co2Raw / 1000) : null,
    posCountry,
    priceUsd: it.price ?? 0,
    bookingToken: it.booking_token ?? it.next_token ?? null,
  };
}

// ── getCalendarPicker (GET) ──────────────────────────────────

interface ApiCalendarEntry {
  departure?: string;
  return?: string | null;
  price?: number;
}

interface ApiCalendarResponse {
  status?: boolean;
  data?: ApiCalendarEntry[];
}

export async function getCalendarForPOS(params: {
  departureId: string;
  arrivalId: string;
  outboundDate: string;
  countryCode: string;
  currency?: string;
}): Promise<CalendarResult> {
  const { departureId, arrivalId, countryCode, currency = "USD" } = params;

  const cc = countryCode.toUpperCase();
  const ccy = currency.toUpperCase();

  if (!isValidCountry(cc)) {
    throw new Error(`Unsupported country_code for calendar: ${cc}`);
  }
  if (!isValidCurrency(ccy)) {
    throw new Error(`Unsupported currency for calendar: ${ccy}`);
  }

  const qs = new URLSearchParams({
    departure_id: departureId.toUpperCase(),
    arrival_id: arrivalId.toUpperCase(),
    currency: ccy,
    country_code: cc,
    travel_class: "ECONOMY",
    trip_type: "ONE_WAY",
    adults: "1",
  });

  const res = await fetch(`${API_BASE}/getCalendarPicker?${qs}`, {
    method: "GET",
    headers: apiHeaders(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`getCalendarPicker ${countryCode}: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as ApiCalendarResponse;
  const entries = json?.data ?? [];

  return {
    posCountry: countryCode.toUpperCase(),
    days: entries.map((e) => ({
      date: e.departure ?? "",
      price: e.price ?? null,
    })),
  };
}

// ── getBookingDetails (GET) ──────────────────────────────────

interface ApiBookingDetailsResponse {
  status?: boolean;
  message?: string;
  data?: Array<{
    id?: string;
    title?: string;
    website?: string;
    price?: number;
    is_airline?: boolean;
    token?: string;
  }>;
}

export interface BookingOption {
  id: string;
  title: string;
  website: string;
  price: number;
  isAirline: boolean;
  token: string;
}

export async function getBookingDetails(params: {
  bookingToken: string;
  currency?: string;
  countryCode?: string;
}): Promise<BookingOption[]> {
  const { bookingToken, currency = "USD", countryCode = "US" } = params;

  const qs = new URLSearchParams({
    booking_token: bookingToken,
    currency: currency.toUpperCase(),
    language_code: "en-US",
    country_code: countryCode.toUpperCase(),
  });

  const res = await fetch(`${API_BASE}/getBookingDetails?${qs}`, {
    method: "GET",
    headers: apiHeaders(),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`getBookingDetails: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as ApiBookingDetailsResponse;

  if (!json.status || !json.data) {
    throw new Error(`getBookingDetails: API returned status=false`);
  }

  return json.data.map((d) => ({
    id: d.id ?? "",
    title: d.title ?? "",
    website: d.website ?? "",
    price: d.price ?? 0,
    isAirline: d.is_airline ?? false,
    token: d.token ?? "",
  }));
}

// ── getBookingURL (GET) ──────────────────────────────────────

interface ApiBookingURLResponse {
  status?: boolean;
  message?: string;
  data?: string;
}

export async function getBookingURL(params: {
  bookingToken: string;
  currency?: string;
  countryCode?: string;
}): Promise<string> {
  const { bookingToken, currency = "USD", countryCode = "US" } = params;

  const qs = new URLSearchParams({
    token: bookingToken, // API expects 'token', not 'booking_token'
    currency: currency.toUpperCase(),
    language_code: "en-US",
    country_code: countryCode.toUpperCase(),
  });

  const res = await fetch(`${API_BASE}/getBookingURL?${qs}`, {
    method: "GET",
    headers: apiHeaders(),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`getBookingURL: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as ApiBookingURLResponse;

  if (!json.status || !json.data) {
    throw new Error(`getBookingURL: API returned status=false`);
  }

  return json.data;
}

// ── Parallel POS fetcher with circuit breaker ────────────────

export interface POSFetchResult {
  country: string;
  flights: NormalisedFlight[];
  error: string | null;
  latencyMs: number;
}

export async function fetchAllPOS(params: {
  departureId: string;
  arrivalId: string;
  outboundDate: string;
  countries: string[];
  currency?: string;
}): Promise<{ results: POSFetchResult[]; rateLimited: boolean }> {
  const { departureId, arrivalId, outboundDate, countries, currency } = params;
  let rateLimited = false;

  const BATCH_SIZE = 3;
  const results: POSFetchResult[] = [];

  for (let i = 0; i < countries.length; i += BATCH_SIZE) {
    const batch = countries.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (cc): Promise<POSFetchResult> => {
        const start = Date.now();
        try {
          const flights = await searchFlightsForPOS({
            departureId, arrivalId, outboundDate,
            countryCode: cc, currency,
          });
          return { country: cc, flights, error: null, latencyMs: Date.now() - start };
        } catch (err: any) {
          if (err?.status === 429) rateLimited = true;
          return {
            country: cc, flights: [],
            error: err instanceof Error ? err.message : String(err),
            latencyMs: Date.now() - start,
          };
        }
      })
    );
    results.push(...batchResults);
    if (rateLimited) break;
  }

  return { results, rateLimited };
}

// ── Deduplication & merge ────────────────────────────────────

export interface MergedPOSOption {
  country: string;
  priceUsd: number;
  bookingToken: string | null;
}

export interface MergedFlight {
  signature: string;
  airline: string;
  airlineLogo: string;
  legs: NormalisedLeg[];
  totalDurationMinutes: number;
  stops: number;
  co2Kg: number | null;
  cheapestPriceUsd: number;
  cheapestPOS: string;
  posOptions: MergedPOSOption[];
}

export function mergeFlightsBySignature(
  allResults: POSFetchResult[]
): MergedFlight[] {
  const bySignature = new Map<string, {
    base: NormalisedFlight;
    options: Map<string, MergedPOSOption>;
  }>();

  for (const posResult of allResults) {
    for (const flight of posResult.flights) {
      if (flight.priceUsd <= 0) continue;

      const existing = bySignature.get(flight.signature);

      if (!existing) {
        bySignature.set(flight.signature, {
          base: flight,
          options: new Map([[flight.posCountry, {
            country: flight.posCountry,
            priceUsd: flight.priceUsd,
            bookingToken: flight.bookingToken,
          }]]),
        });
      } else {
        const prev = existing.options.get(flight.posCountry);
        if (!prev || flight.priceUsd < prev.priceUsd) {
          existing.options.set(flight.posCountry, {
            country: flight.posCountry,
            priceUsd: flight.priceUsd,
            bookingToken: flight.bookingToken,
          });
        }
      }
    }
  }

  const merged: MergedFlight[] = [];

  for (const [, { base, options }] of bySignature) {
    const posOptions = [...options.values()].sort((a, b) => a.priceUsd - b.priceUsd);
    const cheapest = posOptions[0];

    merged.push({
      signature: base.signature,
      airline: base.airline,
      airlineLogo: base.airlineLogo,
      legs: base.legs,
      totalDurationMinutes: base.totalDurationMinutes,
      stops: base.stops,
      co2Kg: base.co2Kg,
      cheapestPriceUsd: cheapest?.priceUsd ?? 0,
      cheapestPOS: cheapest?.country ?? "",
      posOptions,
    });
  }

  merged.sort((a, b) => a.cheapestPriceUsd - b.cheapestPriceUsd);
  return merged;
}
