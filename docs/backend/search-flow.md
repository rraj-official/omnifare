# Flight Search Flow

Complete documentation of the `/api/geoarb/search` request lifecycle, from incoming POST to JSON response.

---

## Endpoint

```
POST /api/geoarb/search
Content-Type: application/json
```

### Request Body

```typescript
{
  origin:        string;   // Required. IATA code, e.g. "DEL"
  destination:   string;   // Required. IATA code, e.g. "BLR"
  date:          string;   // Required. yyyy-MM-dd, e.g. "2026-03-17"
  cabin_class?:  string;   // Optional. Default "economy"
  passengers?:   number;   // Optional. Default 1
  user_currency?: string;  // Optional. Default "USD"
}
```

### Response (Success)

```typescript
{
  cache:          "hit" | "miss" | "mock" | "stale_fallback";
  search_key?:   string;
  cache_age_minutes?: number;
  engine?:       "GeoArb v3" | "mock";
  source?:       "live" | "mock";
  pos_plan?:     GeoArbPlan;
  pos_stats?:    { total, succeeded, failed, failed_countries, rate_limited };
  user_currency: string;
  flights:       PricedFlight[];
}
```

---

## Flow Diagram

```
POST /api/geoarb/search
        │
        ▼
┌───────────────────────┐
│ 1. Parse & validate   │
│    - JSON body        │
│    - origin, dest, date│
│    - user_currency    │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 2. Mock mode?         │
│    USE_MOCK_DATA=true? │
└───────────┬───────────┘
            │ Yes → return mockFlights
            │ No
            ▼
┌───────────────────────┐
│ 3. RAPIDAPI_KEY set?  │
└───────────┬───────────┘
            │ No → 503
            │ Yes
            ▼
┌───────────────────────┐
│ 4. Cache lookup       │
│    Supabase flight_cache│
│    by search_key       │
└───────────┬───────────┘
            │ Hit → return cached (200)
            │ Miss
            ▼
┌───────────────────────┐
│ 5. GeoArb plan        │
│    countryForAirport() │
│    getPriorityPOS()    │
│    → 8 countries      │
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│ 6. fetchAllPOS()      │
│    8 parallel (batched)│
│    DataCrawler calls   │
└───────────┬───────────┘
            │ 429 → try stale cache or 429
            │ OK
            ▼
┌───────────────────────┐
│ 7. mergeFlightsBySignature() │
│    Deduplicate by      │
│    flight signature    │
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│ 8. applyPricing()     │
│    FX convert + 3% fee │
│    per POS option      │
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│ 9. setCache()         │
│    Write to Supabase   │
│    (async, non-block)  │
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│ 10. Return JSON       │
│     flights, stats    │
└───────────────────────┘
```

---

## Step-by-Step Logic

### Step 1: Parse and Validate

```typescript
body = await request.json();
const { origin, destination, date, cabin_class, passengers, user_currency = "USD" } = body;

if (!origin || !destination || !date) {
  return 400 "Missing required fields"
}

const searchKey = `${origin}_${destination}_${date}_${cabinClass}_${passengers}`.toLowerCase();

if (!isValidCurrency(userCcy)) return 400;
```

Invalid JSON → 400. Missing fields → 400. Invalid currency → 400.

---

### Step 2: Mock Mode

If `NEXT_PUBLIC_USE_MOCK_DATA === "true"`:
- Import `mockFlights` from `lib/mockFlights.ts`
- Transform to API response shape (legs, pos_options, etc.)
- Return immediately with `cache: "mock"`, `source: "mock"`
- No live API calls, no cache read/write

---

### Step 3: API Key Check

If `RAPIDAPI_KEY` is not set:
- Return **503** "Flight search service is not configured (RAPIDAPI_KEY missing)"
- No mock fallback in live mode — explicit failure

---

### Step 4: Cache Lookup

```typescript
const cached = await getCache(searchKey);
```

- Uses **anon key** (NEXT_PUBLIC_SUPABASE_ANON_KEY) for read
- Queries: `SELECT merged_data, created_at FROM flight_cache WHERE search_key = ?`
- On hit: return `{ cache: "hit", flights: cached.merged_data, cache_age_minutes }`
- Cache is shared across all users (no user-scoping)

---

### Step 5: GeoArb Plan

```typescript
const fromCC = countryForAirport(origin);    // DEL → IN
const toCC = countryForAirport(destination); // BLR → IN (domestic) or DXB → AE
const plan = getPriorityPOS(fromCC, toCC);
// plan.countries = ["IN", "AE", "US", "VN", "EG", "TR", "AR", "BR"] (example)
```

`countryForAirport` uses `AIRPORT_COUNTRY` map in the route. Unmapped airports default to `"US"`.

---

### Step 6: fetchAllPOS

```typescript
const { results: posResults, rateLimited } = await fetchAllPOS({
  departureId: origin,
  arrivalId: destination,
  outboundDate: date,
  countries: plan.countries,
  currency: "USD",
});
```

- Batches of 3 countries; batches run sequentially, countries within batch in parallel
- Each call: `GET https://google-flights2.p.rapidapi.com/api/v1/searchFlights?departure_id=...&arrival_id=...&country_code=...`
- On any 429: `rateLimited = true`, stop further batches
- Per-POS errors are captured; failed POS return empty flights, not thrown

**Circuit breaker on 429:**
```typescript
if (rateLimited) {
  const stale = await getCache(searchKey);
  if (stale) return { cache: "stale_fallback", flights: stale.merged_data };
  return 429 "Rate limit reached and no cached results available"
}
```

---

### Step 7: Merge by Signature

```typescript
const successfulPOS = posResults.filter(r => r.flights.length > 0);
const merged = mergeFlightsBySignature(successfulPOS);
```

**Merge logic (see flight-api-service.md):**
- Group by `signature` = `flightKey|departureTime(16)|legs.length`
- Same flight from multiple POS → one merged flight with multiple `posOptions`
- Same POS, multiple prices (shouldn't happen) → keep lower price
- Flights with `priceUsd <= 0` are dropped

**If merged.length === 0:** Return 404 with `pos_stats` (succeeded, failed, failed_countries).

---

### Step 8: Apply Pricing

```typescript
const pricedAll = await applyPricing(merged, userCcy);
const pricedFlights = pricedAll.filter(f => f.cheapest_total > 0);
pricedFlights.sort((a, b) => a.cheapest_total - b.cheapest_total);
```

**applyPricing** (per flight, per POS option):
1. Get POS currency via `currencyForCountry(opt.country)`
2. If userCcy === USD: `price = opt.priceUsd`, `fxRate = 1`
3. Else: `convert(opt.priceUsd, "USD", userCcy, 0)` → `price`, `fxRate`
4. Bank fee: `posCcy !== userCcy ? round(price * 0.03) : 0`
5. Total: `price + bankFee`
6. Enrich: `country_name`, `flag_emoji`, `provider` (from COUNTRY_OTA), `provider_website`
7. Filter out options with `converted_price <= 0` or `total <= 0`
8. Sort POS options by total (cheapest first)

Output shape per flight:
```typescript
{
  signature, airline, airline_logo, legs,
  total_duration_minutes, stops, co2_kg,
  cheapest_total, cheapest_pos,
  user_currency,
  pos_options: [{ country, country_name, flag_emoji, provider, provider_website, ... }]
}
```

---

### Step 9: Write Cache

```typescript
setCache(searchKey, pricedFlights);
```

- Uses **service role key** (SUPABASE_SERVICE_ROLE_KEY)
- `upsert` on `search_key` (unique index)
- Fire-and-forget: errors logged, not thrown
- Non-blocking: response sent before cache write completes

---

### Step 10: Response

```typescript
return NextResponse.json({
  cache: "miss",
  search_key: searchKey,
  engine: "GeoArb v3",
  source: "live",
  pos_plan: plan,
  pos_stats: { total, succeeded, failed, failed_countries, rate_limited },
  user_currency: userCcy,
  flights: pricedFlights,
});
```

---

## Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Invalid JSON, missing origin/destination/date, invalid currency |
| 404 | No flights found (merged.length === 0) |
| 429 | Rate limited and no cache available |
| 500 | Uncaught exception |
| 503 | RAPIDAPI_KEY missing |

---

## Risk Levels

In `applyPricing`, each POS option gets a `risk_level`:

```typescript
function riskLevel(cc: string): "low" | "medium" {
  const mediumRisk = new Set(["AR", "EG", "VN", "NG", "PK", "BD"]);
  return mediumRisk.has(cc.toUpperCase()) ? "medium" : "low";
}
```

Countries with volatile currencies or less-established payment rails are marked "medium" so the frontend can show advisory badges (e.g., VPN recommendation).
