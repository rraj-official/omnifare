# API Routes

All backend API routes live under `app/api/geoarb/`. Each route is a Next.js Route Handler (App Router).

---

## Route Summary

| Route | Method | Purpose | maxDuration |
|-------|--------|---------|-------------|
| `/api/geoarb/search` | POST | Main flight search (GeoArb) | 60s |
| `/api/geoarb/calendar` | POST | Calendar price grid (30 days) | default |
| `/api/geoarb/booking-options` | POST | Batch getBookingDetails for multiple tokens | 60s |
| `/api/geoarb/booking-details` | POST | Single getBookingDetails | 60s |
| `/api/geoarb/booking` | POST | getBookingURL → deeplink | 60s |
| `/api/geoarb/health` | GET | Supabase connectivity check | default |

---

## POST /api/geoarb/search

**File:** `app/api/geoarb/search/route.ts`

**Purpose:** Main flight search. Orchestrates GeoArb plan, parallel POS fetch, merge, FX conversion, and cache.

**Request:**
```json
{
  "origin": "DEL",
  "destination": "BLR",
  "date": "2026-03-17",
  "cabin_class": "economy",
  "passengers": 1,
  "user_currency": "INR"
}
```

**Response:** See [search-flow.md](./search-flow.md).

---

## POST /api/geoarb/calendar

**File:** `app/api/geoarb/calendar/route.ts`

**Purpose:** Returns per-day flight prices for a 30-day calendar. GeoArb-aware: compares **origin POS** vs **destination POS** to surface days where booking from the destination country is cheaper.

**Request:**
```json
{
  "origin": "DEL",
  "destination": "BLR",
  "currency": "USD",
  "date": "2026-03-01"
}
```

- `date` is the start of the calendar month (default: tomorrow).
- Calls `getCalendarForPOS` twice in parallel: once with `countryCode: originCC`, once with `countryCode: destCC`.

**Response:**
```json
{
  "source": "live",
  "origin_pos": "IN",
  "dest_pos": "IN",
  "currency": "USD",
  "days": [
    {
      "date": "2026-03-01",
      "origin_pos_price": 4200,
      "dest_pos_price": 4100,
      "cheapest_price": 4100,
      "cheapest_pos": "IN",
      "is_geoarb_opportunity": true
    }
  ],
  "stats": {
    "total_days": 30,
    "geoarb_opportunities": 5,
    "cheapest_day": { ... }
  }
}
```

**Overlay logic:** For each day, if `destPrice < originPrice` → `is_geoarb_opportunity: true`, meaning booking from the destination country is cheaper that day.

**Mock mode:** If `NEXT_PUBLIC_USE_MOCK_DATA=true` or no RAPIDAPI_KEY, `generateMockCalendar()` returns deterministic fake prices (weekend premium, POS-specific discount multipliers).

---

## POST /api/geoarb/booking-options

**File:** `app/api/geoarb/booking-options/route.ts`

**Purpose:** Batch fetch booking provider options for multiple booking tokens (one per POS). Used when the frontend has top 3 cheapest POS tokens and wants to resolve provider names (Cleartrip, MakeMyTrip, etc.) in one request.

**Request:**
```json
{
  "items": [
    { "booking_token": "token1", "country_code": "TR", "currency": "INR" },
    { "booking_token": "token2", "country_code": "IN", "currency": "INR" },
    { "booking_token": "token3", "country_code": "AE", "currency": "INR" }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "posCountryCode": "TR",
      "posCountryName": "Turkey",
      "posFlagEmoji": "🇹🇷",
      "success": true,
      "options": [
        { "title": "Cleartrip", "website": "cleartrip.com", "price": 6200, "is_airline": false, "token": "provider_token_1" },
        { "title": "MakeMyTrip", "website": "makemytrip.com", "price": 6350, "is_airline": false, "token": "provider_token_2" }
      ]
    },
    { "posCountryCode": "IN", "success": true, "options": [...] },
    { "posCountryCode": "AE", "success": false, "error": "Timeout", "options": [] }
  ]
}
```

- Runs `Promise.all(items.map(getBookingDetails))` — all in parallel.
- Per-item failure → `{ country_code, options: [], success: false, error }`, not thrown.
- `maxDuration: 60` — each getBookingDetails can take 45s.

---

## POST /api/geoarb/booking-details

**File:** `app/api/geoarb/booking-details/route.ts`

**Purpose:** Single `getBookingDetails` call for one booking token. Used when the frontend only has one token (e.g., legacy flow).

**Request:**
```json
{
  "booking_token": "flight_level_token",
  "currency": "INR",
  "country_code": "TR"
}
```

**Response:**
```json
{
  "options": [
    { "id": "...", "title": "Cleartrip", "website": "cleartrip.com", "price": 6200, "is_airline": false, "token": "provider_token" }
  ]
}
```

**Token semantics:**
- `booking_token` = from search result (flight-level, one per POS)
- `token` in each option = provider-level, used for `getBookingURL`

---

## POST /api/geoarb/booking

**File:** `app/api/geoarb/booking/route.ts`

**Purpose:** Resolve a **provider token** (from getBookingDetails) to a booking deeplink URL.

**Request:**
```json
{
  "token": "provider_token_from_booking_details",
  "currency": "INR",
  "country_code": "TR"
}
```

**Note:** The parameter is `token`, not `booking_token`. This is the provider-specific token returned by getBookingDetails.

**Response:**
```json
{
  "booking_url": "https://www.cleartrip.com/flights/book?token=..."
}
```

**Error handling:**
- Mock mode → 503
- No RAPIDAPI_KEY → 503
- getBookingURL returns status=false or no data → 400 or 500 with error message
- 45s timeout → 504

---

## GET /api/geoarb/health

**File:** `app/api/geoarb/health/route.ts`

**Purpose:** Health check for Supabase connectivity. Used by dev/CI scripts.

**Request:** No body.

**Response:**
```json
{
  "status": "online",
  "database": "connected",
  "timestamp": "2026-03-01T12:00:00.000Z"
}
```

**Logic:**
- If SUPABASE_URL or SUPABASE_ANON_KEY missing → `database: "not_configured"`
- `from("profiles").select("id").limit(1).maybeSingle()`
- On error → 503, `status: "degraded"`

---

## Auth Callback (OAuth)

**File:** `app/auth/callback/route.ts`

**Purpose:** Supabase OAuth code exchange. After user signs in with Google, Google redirects to `/auth/callback?code=...`. This route exchanges the code for a session and redirects back to the app.

**Flow:**
1. Read `code` from query params
2. `supabase.auth.exchangeCodeForSession(code)`
3. Redirect to `origin` (from request headers) or `/`

Not part of `/api/geoarb/` but critical for auth.
