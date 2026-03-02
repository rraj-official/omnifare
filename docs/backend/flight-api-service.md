# Flight API Service

`lib/flightApiService.ts` — DataCrawler Google Flights 2 API integration. All external flight data (search, calendar, booking) flows through this module.

---

## API Host

```
https://google-flights2.p.rapidapi.com/api/v1
```

**Authentication:** `x-rapidapi-key` and `x-rapidapi-host` headers from `RAPIDAPI_KEY` env var.

---

## Endpoints

| Function | API Path | Method | Purpose |
|----------|----------|--------|---------|
| `searchFlightsForPOS` | `/searchFlights` | GET | Flight search for one POS |
| `getCalendarForPOS` | `/getCalendarPicker` | GET | 30-day price calendar |
| `getBookingDetails` | `/getBookingDetails` | GET | Provider options for a booking token |
| `getBookingURL` | `/getBookingURL` | GET | Deeplink URL from provider token |
| `fetchAllPOS` | — | — | Batch wrapper for searchFlightsForPOS |
| `mergeFlightsBySignature` | — | — | Deduplicate + merge POS results |

---

## searchFlightsForPOS

### Signature

```typescript
export async function searchFlightsForPOS(params: {
  departureId: string;
  arrivalId: string;
  outboundDate: string;
  countryCode: string;
  currency?: string;
  cabinClass?: string;
  adults?: number;
}): Promise<NormalisedFlight[]>
```

### Query Parameters (GET)

| Param | Example | Description |
|-------|---------|-------------|
| `departure_id` | DEL | IATA origin |
| `arrival_id` | BLR | IATA destination |
| `outbound_date` | 2026-03-17 | yyyy-MM-dd |
| `currency` | USD | Target currency |
| `country_code` | TR | POS country (ISO-2) |
| `search_type` | cheap | Always `"cheap"` |
| `travel_class` | ECONOMY | Cabin class |
| `adults` | 1 | Passenger count |
| `show_hidden` | 1 | Include hidden flights |
| `language_code` | en-US | Language |

### Response Handling

API returns either:
- `data.topFlights` / `data.otherFlights` (search_type=best)
- `data.itineraries.topFlights` / `data.itineraries.otherFlights` (search_type=cheap)

Both shapes are normalized. All flights from `topFlights` and `otherFlights` are combined and mapped to `NormalisedFlight[]`.

### Normalisation

```typescript
function normalise(it: ApiFlightResult, posCountry: string): NormalisedFlight
```

**Per leg:**
- `airline`, `airlineLogo`, `flightNumber`
- `departureAirport`, `departureCode`, `departureTime`
- `arrivalAirport`, `arrivalCode`, `arrivalTime`
- `durationMinutes`, `aircraft`

**Signature construction:**
```
flightKey = flightNumber (if present) else `${airline}${routeKey}`
routeKey = `${departureCode}-${arrivalCode}`
signature = `${flightKey}|${departureTime.slice(0,16)}|${legs.length}`
```

Example: `IX2679|2026-03-17 08:34|1` for a direct Air India Express flight.

**Purpose of signature:** Deterministic identity across POS. The same physical flight from TR and IN must merge to one record; the signature ensures they match.

### 429 Handling

If `res.status === 429`:
- Throws `Error` with `err.status = 429`
- `fetchAllPOS` catches this and sets `rateLimited = true`

### Timeout

`AbortSignal.timeout(30_000)` — 30 seconds per request.

---

## getCalendarForPOS

### Signature

```typescript
export async function getCalendarForPOS(params: {
  departureId: string;
  arrivalId: string;
  outboundDate: string;
  countryCode: string;
  currency?: string;
}): Promise<CalendarResult>
```

### Query Parameters

| Param | Description |
|-------|-------------|
| `departure_id`, `arrival_id` | IATA codes |
| `currency`, `country_code` | POS currency and country |
| `travel_class` | ECONOMY |
| `trip_type` | ONE_WAY |
| `adults` | 1 |

### Response

```typescript
interface CalendarResult {
  posCountry: string;
  days: { date: string; price: number | null }[];
}
```

API `data` is an array of `{ departure, return, price }`. Mapped to `CalendarDay[]`.

**Timeout:** 15 seconds.

---

## getBookingDetails

### Signature

```typescript
export async function getBookingDetails(params: {
  bookingToken: string;
  currency?: string;
  countryCode?: string;
  timeoutMs?: number;
}): Promise<BookingOption[]>
```

### Query Parameters

| Param | Description |
|-------|-------------|
| `booking_token` | From search result (flight-level) |
| `currency` | INR, USD, etc. |
| `country_code` | POS country |
| `language_code` | en-US |

### Response

```typescript
interface BookingOption {
  id: string;
  title: string;      // "Cleartrip", "MakeMyTrip"
  website: string;    // "cleartrip.com"
  price: number;
  isAirline: boolean;
  token: string;     // Provider-level token for getBookingURL
}
```

**Timeout:** 45 seconds (default).

---

## getBookingURL

### Signature

```typescript
export async function getBookingURL(params: {
  bookingToken: string;
  currency?: string;
  countryCode?: string;
}): Promise<string>
```

**Note:** The API expects `token` in the query, not `booking_token`. The param is the provider token from getBookingDetails.

### Response

Returns `data` (string) — the full booking deeplink URL.

**Timeout:** 45 seconds.

---

## fetchAllPOS

### Purpose

Run `searchFlightsForPOS` for multiple countries with batching and circuit breaker.

### Signature

```typescript
export async function fetchAllPOS(params: {
  departureId: string;
  arrivalId: string;
  outboundDate: string;
  countries: string[];
  currency?: string;
}): Promise<{ results: POSFetchResult[]; rateLimited: boolean }>
```

### Batching

```typescript
const BATCH_SIZE = 3;

for (let i = 0; i < countries.length; i += BATCH_SIZE) {
  const batch = countries.slice(i, i + BATCH_SIZE);
  const batchResults = await Promise.all(
    batch.map(cc => searchFlightsForPOS({ ...params, countryCode: cc }))
  );
  results.push(...batchResults);
  if (rateLimited) break;
}
```

- Batches of 3 run in parallel
- Batches run **sequentially** (batch 2 starts after batch 1 completes)
- On any 429: `rateLimited = true`, stop further batches

### POSFetchResult

```typescript
interface POSFetchResult {
  country: string;
  flights: NormalisedFlight[];
  error: string | null;
  latencyMs: number;
}
```

Per-POS errors don't throw — they're captured in `error`. `flights` is empty on failure.

---

## mergeFlightsBySignature

### Purpose

Deduplicate flights from multiple POS results into a single merged structure. Same flight from 5 POSes → 1 flight with 5 posOptions.

### Signature

```typescript
export function mergeFlightsBySignature(
  allResults: POSFetchResult[]
): MergedFlight[]
```

### Algorithm

1. **Group by signature:** `Map<signature, { base, options }>`
2. For each flight in each POS result:
   - Skip if `priceUsd <= 0`
   - If signature new: create entry with first POS option
   - If signature exists: add/update POS option
     - Same POS already present: keep lower price
     - `bookingToken`: prefer new flight's token, fallback to previous if new is null
3. For each group: sort `posOptions` by price, compute `cheapestPriceUsd`, `cheapestPOS`
4. Sort merged flights by `cheapestPriceUsd`
5. Return `MergedFlight[]`

### MergedFlight

```typescript
interface MergedFlight {
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

interface MergedPOSOption {
  country: string;
  priceUsd: number;
  bookingToken: string | null;
}
```

---

## Token Flow Summary

```
Search (searchFlights)
  → Each flight has booking_token (or next_token) per POS
  → Stored in pos_options[].booking_token

User selects flight
  → pos_options[] has multiple booking_tokens (one per POS)

Booking options (getBookingDetails)
  → Input: booking_token (flight-level, per POS)
  → Output: options[].token (provider-level)

User selects provider
  → options[].token

Booking URL (getBookingURL)
  → Input: token (provider-level)
  → Output: booking_url (deeplink)
```

**Critical:** getBookingURL requires the **provider token**, not the original booking_token from search.
