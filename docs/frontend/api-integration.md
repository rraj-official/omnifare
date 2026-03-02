# API Integration

All frontend API calls go to Next.js Route Handlers under `/api/geoarb/`. These Route Handlers act as a backend-for-frontend (BFF) layer — the browser never calls the external DataCrawler API directly.

---

## API Endpoints Overview

| Endpoint | Method | Caller | Purpose |
|----------|--------|--------|---------|
| `/api/geoarb/search` | POST | `results/page.tsx` | Search flights across 8 POS countries |
| `/api/geoarb/calendar` | POST | `SearchBar.tsx` | Get per-date prices for a route (30-day grid) |
| `/api/geoarb/booking-options` | POST | `BookingProviders.tsx` | Get provider names for top 3 POS tokens |
| `/api/geoarb/booking` | POST | `BookingProviders.tsx`, `POSTable.tsx` | Get booking redirect URL |
| `/api/geoarb/health` | GET | Dev scripts | Health check |

---

## `POST /api/geoarb/search`

### Called From
`app/results/page.tsx` — `fetchFlights()` function

### Request

```typescript
fetch("/api/geoarb/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  signal: abortController.signal,   // Cancellable
  body: JSON.stringify({
    origin:        "DEL",           // IATA code
    destination:   "BLR",           // IATA code
    date:          "2026-03-17",    // yyyy-MM-dd
    user_currency: "INR",           // Always INR (frontend converts client-side)
    cabin_class:   "economy",       // Always economy (hardcoded)
    passengers:    1,               // Always 1 (hardcoded)
  })
})
```

### Response Shape

```typescript
{
  flights: [
    {
      // Per-flight object from DataCrawler API, merged across all POS
      airline_logo:      string         // URL or empty
      duration_mins:     number
      co2_emissions_kg:  number
      emissions_change:  string         // "+5% vs avg"
      carry_on:          boolean
      checked_bag:       boolean
      legs: [
        {
          airline:               string
          flight_number:         string
          aircraft:              string
          departure_airport:     string  // IATA code
          departure_airport_name: string
          arrival_airport:       string
          arrival_airport_name:  string
          departure_datetime:    string  // ISO 8601
          arrival_datetime:      string
          duration_mins:         number
        }
      ],
      pos_options: [
        {
          country_code:    string   // "TR"
          country_name:    string   // "Turkey"
          flag_emoji:      string   // "🇹🇷"
          price:           number   // In INR
          currency:        string   // "INR"
          provider:        string   // "Cleartrip" (may be empty)
          provider_logo:   string | null
          provider_website: string | null
          booking_token:   string | null  // For getBookingDetails
          risk_level:      "low" | "medium"
          risk_note:       string | null
        }
      ]
    }
  ],
  posStats: {
    searched:    number   // Number of POS countries queried
    successful:  number   // Number that returned results
    failed:      string[] // Country codes that failed
  },
  source: "live" | "mock" | "cache"
}
```

### Error Cases

| HTTP Status | Meaning | Frontend Handling |
|-------------|---------|------------------|
| 400 | Bad request (invalid IATA, missing params) | Shows error message in UI |
| 429 | Rate limited | Falls back to Supabase cache if available |
| 500 | Internal error | Shows error card with "Try Again" button |

### Caching

The frontend caches the response in sessionStorage with key `omnifare_flights_{from}_{to}_{date}`. On subsequent renders (e.g., Back navigation), the cached response is used and the API is not called.

### Backend Behavior (what the Route Handler does)

1. Validates origin/destination as IATA codes
2. Calls `GeoArbEngine.getPriorityPOS(origin_country, dest_country)` → 8 country codes
3. Makes 8 parallel calls to DataCrawler `searchFlights` (one per POS country)
4. For each result, converts prices to INR using `ExchangeRateService`
5. Merges all results by flight signature (airline + departure + arrival + stops)
6. For each merged flight, keeps the POS options from all sources
7. Caches in Supabase `flight_cache` table
8. Returns merged flights

---

## `POST /api/geoarb/calendar`

### Called From
`components/omni/SearchBar.tsx` — `useEffect` when origin and destination are both set

### Request

```typescript
fetch("/api/geoarb/calendar", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  signal: calendarFetchRef.current.signal,   // Cancellable (aborted on next origin/dest change)
  body: JSON.stringify({
    origin:      "DEL",
    destination: "BLR",
  })
})
```

### Response Shape

The backend may return either format (the frontend handles both):

**Format 1 (preferred):**
```typescript
{
  prices: {
    "2026-03-10": 4200,
    "2026-03-11": 4850,
    "2026-03-12": 5500,
    // ... 30 days
  }
}
```

**Format 2 (legacy):**
```typescript
{
  days: [
    { date: "2026-03-10", price: 4200 },
    { date: "2026-03-11", cheapest_price: 4850 },  // alternate field name
    // ...
  ]
}
```

The frontend normalizes both to a `Record<string, number>`:
```typescript
if (data.prices) {
  setCalendarPrices(data.prices)
} else if (data.days) {
  const normalized: Record<string, number> = {}
  data.days.forEach((d: any) => {
    normalized[d.date] = d.price ?? d.cheapest_price
  })
  setCalendarPrices(normalized)
}
```

### Frontend Usage

The normalized `prices` object is passed to `PriceCalendar` as `livePrices`. The calendar renders colored labels:
- Green: `price < ₹4,800`
- Blue: `price < ₹5,800`
- Red: `price >= ₹5,800`

### Backend Behavior

1. Calls DataCrawler `getCalendarPicker` for user POS (based on origin country)
2. Also calls for destination POS (GeoArb-aware)
3. Overlays both to surface "GeoArb Opportunity" dates
4. Returns cheapest price per date across all queried POSes

---

## `POST /api/geoarb/booking-options`

### Called From
`components/omni/BookingProviders.tsx` — `useEffect` on mount

### Request

```typescript
fetch("/api/geoarb/booking-options", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    items: [
      {
        booking_token: "token_from_search_result_TR",
        country_code:  "TR",
        currency:      "INR",
      },
      {
        booking_token: "token_from_search_result_IN",
        country_code:  "IN",
        currency:      "INR",
      },
      {
        booking_token: "token_from_search_result_AE",
        country_code:  "AE",
        currency:      "INR",
      },
    ]
  })
})
```

**Note:** Only the top 3 cheapest POS options that have a `bookingToken` are included. `posOptions` with `bookingToken === null` are skipped.

### Response Shape

```typescript
{
  results: [
    {
      posCountryCode:  "TR",
      posCountryName:  "Turkey",
      posFlagEmoji:    "🇹🇷",
      success:         true,
      options: [
        {
          title:       "Cleartrip",      // OTA name
          website:     "cleartrip.com",  // Domain (for favicon)
          price:       6200,             // Price in INR
          is_airline:  false,
          token:       "deep_link_token_for_this_specific_provider",
        },
        {
          title:       "MakeMyTrip",
          website:     "makemytrip.com",
          price:       6350,
          is_airline:  false,
          token:       "deep_link_token_makemytrip",
        }
      ]
    },
    {
      posCountryCode: "IN",
      success: true,
      options: [...]
    },
    {
      posCountryCode: "AE",
      success: false,        // This POS failed (timeout, error)
      error: "Timeout",
      options: []
    }
  ]
}
```

### Frontend Deduplication

After receiving the response, `BookingProviders` deduplicates providers by title, keeping the cheapest price:

```typescript
const byTitle = new Map<string, LiveBookingOption>()
results.forEach(result => {
  result.options?.forEach(opt => {
    const existing = byTitle.get(opt.title)
    if (!existing || opt.price < existing.price) {
      byTitle.set(opt.title, {
        id:             `${result.posCountryCode}-${opt.title}`,
        title:          opt.title,
        website:        opt.website,
        price:          opt.price,
        isAirline:      opt.is_airline,
        token:          opt.token,
        posCountryCode: result.posCountryCode,
        posCountryName: result.posCountryName,
        posFlagEmoji:   result.posFlagEmoji,
        posRiskLevel:   MEDIUM_RISK.has(result.posCountryCode) ? "medium" : "low",
      })
    }
  })
})
// Final result: sorted by price, no duplicate provider names
const providers = Array.from(byTitle.values()).sort((a, b) => a.price - b.price)
```

### Why deduplicate by title?
The same OTA (e.g., "Cleartrip") may appear in multiple POS results. A user booking Cleartrip via Turkey POS pays less than via India POS due to GeoArb pricing. We keep only the cheapest-price version of each OTA name.

### Timing Note
This call can take 15–30 seconds because it makes 3 sequential-or-parallel calls to `getBookingDetails` externally. The UI shows a loading spinner with the message: "Loading booking options across all Points of Sale… This may take 15–30 seconds."

---

## `POST /api/geoarb/booking`

### Called From
- `components/omni/BookingProviders.tsx` — `doBooking()` function
- `components/omni/POSTable.tsx` — `doBooking()` function (legacy)

### Request

```typescript
fetch("/api/geoarb/booking", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    token:        option.token,         // Provider-specific deep-link token
    currency:     "INR",
    country_code: option.posCountryCode,  // e.g. "TR"
  })
})
```

**Important:** The `token` here is the provider-specific token from `booking-options` response, **not** the `booking_token` from the search results. The chain is:
```
search → pos_options[].booking_token
       → booking-options API → options[].token  ← this one
       → booking API → booking_url
```

### Response Shape

**Success:**
```typescript
{
  booking_url: "https://www.cleartrip.com/flights/book?token=verylongtoken..."
}
```

**Failure (no URL available):**
```typescript
{
  booking_url: null,
  error: "No booking URL returned by provider"
}
```

### Frontend Handling

```typescript
const data = await res.json()

if (!data.booking_url) {
  newTab?.close()
  setBookingError("Could not retrieve booking URL. Please try a different provider.")
  return
}

if (newTab) newTab.location.href = data.booking_url
```

The `newTab` was opened synchronously before the async fetch to avoid popup blockers. On success, the already-open blank tab is redirected to the booking URL. On failure, the blank tab is closed.

### Timeout Handling
The backend has a `maxDuration` set (Vercel serverless function limit). If the DataCrawler `getBookingURL` call times out, the frontend receives a 504 response. The error is displayed inline and the user can try a different provider.

---

## Error Handling Patterns

### Generic Fetch Error Handler

All three fetch-based flows use this pattern:
```typescript
try {
  const res = await fetch(url, options)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }

  const data = await res.json()
  // ... process data
} catch (err) {
  if (err.name === "AbortError") return  // Intentional cancel, not an error
  setError(err.message)
} finally {
  setLoading(false)
}
```

### AbortError Handling

Aborted requests (from `AbortController`) throw an `AbortError`. This must be caught and silently ignored — it's not an error the user should see.

### JSON Parse Safety

The search route handler validates that `request.body` is valid JSON before processing:
```typescript
let body: any
try {
  body = await request.json()
} catch {
  return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
}
```

---

## Provider Icons (Google Favicon Service)

Provider logos are fetched from Google's favicon service, not from the DataCrawler API:
```typescript
const getFaviconUrl = (website: string) =>
  `https://www.google.com/s2/favicons?domain=${website}&sz=32`
```

This is used in both `BookingProviders` and `POSTable` for OTA logos. If the favicon 404s (Google doesn't have an icon for that domain), the component falls back to a 2-letter initials badge.

---

## Environment Variables (Frontend-Accessible)

Only `NEXT_PUBLIC_` prefixed variables are available in the browser:

| Variable | Used By | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabaseClient.ts` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabaseClient.ts` | Supabase anon/public key |
| `NEXT_PUBLIC_USE_MOCK_DATA` | API routes (server-side) | `"true"` enables mock mode |

**Note:** `NEXT_PUBLIC_USE_MOCK_DATA` is technically accessible from the browser (NEXT_PUBLIC_ prefix), but it's consumed server-side in the Route Handlers to decide whether to call the real DataCrawler API or return mock data. This makes it easy to switch modes without touching code.

Server-only variables (no `NEXT_PUBLIC_` prefix, not exposed to browser):
- `RAPIDAPI_KEY` — DataCrawler API key
- `SUPABASE_SERVICE_ROLE_KEY` — Admin Supabase key for server-side writes

---

## Request Tracing

Each API call from the frontend can be traced using this chain:

```
Browser fetch to /api/geoarb/*
  → Next.js Route Handler (app/api/geoarb/*/route.ts)
    → lib/flightApiService.ts (DataCrawler API calls)
      → https://datacrawler-google-flights.p.rapidapi.com/*
    → lib/exchangeRate.ts (Frankfurter API for FX rates)
      → https://api.frankfurter.app/latest?base=*
    → lib/supabaseServer.ts (Supabase cache read/write)
      → Supabase PostgreSQL
```

---

## Rate Limiting Strategy

The DataCrawler API has rate limits. The backend implements:
1. **Supabase cache**: If a `search_key` (hash of origin+destination+date) exists in `flight_cache`, returns cached data instead of calling the API
2. **Circuit breaker**: On 429 responses, falls back to cache
3. **User usage metering**: `incrementUsage()` gates the booking step (not the search step)

The frontend contributes to rate limit mitigation via:
1. **sessionStorage cache**: Route-specific cache prevents duplicate calls on Back navigation
2. **AbortController**: Cancels in-flight requests when user navigates away or changes search params
