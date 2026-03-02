# User Flows

Complete documentation of every user interaction flow in OmniFare, from entry to completion.

---

## Flow 1: First-Time Visitor

```
User visits omnifare.app/

1. app/layout.tsx renders HTML shell + loads fonts
2. app/providers.tsx mounts context providers
   ├── AuthProvider: supabase.auth.getSession()
   │   → No session found
   │   → isLoggedIn = false, loading = false
   ├── AppStateProvider: initializes defaults
   │   → homeCountry="IN", preferredCurrency="INR"
   │   → origin="DEL", destination=""
   └── Renders shell: Navbar + BudgetTracker + AuthModal + UsageLimitModal

3. app/page.tsx mounts
   ├── useEffect: reads sessionStorage("omnifare_recent_routes")
   │   → Empty (first visit) → recentRoutes = []
   ├── Renders HeroSection (animated airplane)
   ├── Renders SearchBar
   └── Renders 4 hardcoded popular route cards
       (Delhi→Bangalore, Mumbai→Delhi, Delhi→Dubai, Bangalore→Singapore)
```

---

## Flow 2: Authentication (Google OAuth)

### Triggering the modal

The AuthModal opens from two places:
- `SearchBar.handleSearch()` — user tries to search without being logged in
- `Navbar` Sign In button — user explicitly clicks "Sign In"

### Full auth flow

```
User clicks "Sign In" in Navbar
  OR
User clicks "Search" without being logged in
  → setShowAuthModal(true) (AuthProvider state)
  → AuthModal dialog opens

User clicks "Continue with Google"
  → login() called
  → supabase.auth.signInWithOAuth({ provider: "google" })
  → Browser redirects to Google OAuth
  → User consents on Google
  → Google redirects to: {origin}/auth/callback?code=...

/auth/callback/route.ts (Next.js Route Handler)
  → supabase.auth.exchangeCodeForSession(code)
  → Sets Supabase session cookie
  → Redirects to: / (home page)

App reloads at /
  → AuthProvider.useEffect 1 fires again
  → supabase.auth.getSession() → finds new session
  → setSession(session)
  → isLoggedIn = true
  → onAuthStateChange fires with event="SIGNED_IN"
  → setShowAuthModal(false) (closes modal if still open)
  → AuthProvider.useEffect 2 fires (supabaseUser now set)
  → Queries Supabase profiles table for usage stats
  → If new user: profile was auto-created by DB trigger with api_calls_made=0
  → setApiCallsMade(0), setMaxApiLimit(1000)
```

### Logout flow

```
User clicks logout icon in Navbar
  → showLogoutConfirm dialog opens
  → User clicks "Sign Out"
  → logout() called
  → supabase.auth.signOut()
  → onAuthStateChange fires with event="SIGNED_OUT"
  → setSession(null)
  → isLoggedIn = false, user = null
  → router.push("/")
```

---

## Flow 3: Flight Search

```
User selects:
  - Origin: DEL (Delhi)
  - Destination: BLR (Bangalore)
  - Date: March 17, 2026
  (in SearchBar.tsx)

When origin AND destination are both set:
  → useEffect triggers calendar price fetch
  → AbortController created, previous request aborted if any
  → POST /api/geoarb/calendar { origin: "DEL", destination: "BLR" }
  → Response: { prices: { "2026-03-17": 4500, "2026-03-18": 5200, ... } }
  → setCalendarPrices(normalized)
  → PriceCalendar shows colored price heatmap in date picker

User clicks "Search" button:
  → handleSearch() called
  → Validation: origin ✓, destination ✓
  → Auth check: isLoggedIn?
      → If NO: setShowAuthModal(true), stop
      → If YES: continue
  → date = format(departureDate, "yyyy-MM-dd") = "2026-03-17"
  → router.push("/results?from=DEL&to=BLR&date=2026-03-17")
```

---

## Flow 4: Results Page Load

```
Browser navigates to /results?from=DEL&to=BLR&date=2026-03-17

ResultsPage renders
  → Suspense boundary wraps ResultsContent
  → useSearchParams() reads: from="DEL", to="BLR", date="2026-03-17"

ResultsContent.fetchFlights() called via useEffect
  (with AbortController signal)

Step 1: Check sessionStorage cache
  → key: "omnifare_flights_DEL_BLR_2026-03-17"
  → If FOUND: setFlights(cached), setLoading(false), return early
  → If NOT FOUND: proceed to API

Step 2: POST /api/geoarb/search
  Body: {
    origin: "DEL",
    destination: "BLR",
    date: "2026-03-17",
    user_currency: "INR",
    cabin_class: "economy",
    passengers: 1
  }

  Backend does (see api-integration.md for full details):
  → GeoArb engine selects 8 POS countries
  → 8 parallel DataCrawler API calls (one per POS)
  → Prices normalized to INR via Frankfurter exchange rates
  → Results merged, deduplicated by flight signature
  → Returns: { flights: [...], posStats: {...}, source: "live" }

Step 3: mapApiToFlight() on each result
  → Formats times, durations, dates
  → Filters posOptions with price > 0

Step 4: Visual dedup
  → Key: "${airline}-${departure}-${arrival}-${stops}"
  → Keeps the version with the most posOptions

Step 5: Write to sessionStorage
  → "omnifare_flights_DEL_BLR_2026-03-17" = JSON(deduped)  ← route cache
  → "omnifare_flights" = JSON(deduped)                       ← booking page lookup
  → "omnifare_source" = "live"

Step 6: Save recent route
  → Find cheapest flight + cheapest POS
  → Create RecentRoute object
  → Prepend to "omnifare_recent_routes" (max 4, deduped by from+to)

setFlights(deduped)
setLoading(false)

UI renders:
  → SearchBar (compact=true, inline)
  → ResultsFilter (stops/airline/time dropdowns)
  → POS stats bar ("Searched 8 countries")
  → Paginated FlightCard list (10 per page)
```

---

## Flow 5: Filtering Results

```
User changes "Stops" filter to "Direct"
  → setStopsFilter("0")
  → useMemo recomputes `filtered`
  → Only flights with stops === 0 remain
  → setPage(1) resets to first page
  → UI re-renders with filtered list

User changes "Airlines" filter to "IndiGo"
  → setAirlineFilter("IndiGo")
  → useMemo recomputes `filtered` (combined with stops filter)
  → Only IndiGo direct flights remain

User changes back to "All Airlines"
  → setAirlineFilter("all")
  → All direct flights shown again
```

Filters are AND conditions — all active filters must match simultaneously.

---

## Flow 6: Flight Card Expansion

```
User sees a collapsed FlightCard
  → Collapsed view shows: airline, times, duration, price, top-6 POS flags

User clicks the card (anywhere except "Book Now")
  → setExpanded(true) (local state)
  → AnimatePresence triggers enter animation (height: 0 → auto, opacity: 0 → 1)
  → Expanded section reveals:
      - Per-leg breakdown (each flight segment)
      - Baggage information
      - Full POS breakdown table (all POS options, sorted cheapest first)
      - "Book Now" button

User clicks again to collapse
  → setExpanded(false)
  → AnimatePresence exit animation
```

---

## Flow 7: Booking Flow (Complete)

```
User is on /results page
User clicks "Book Now" on a FlightCard

Step 1: Navigation
  → router.push("/booking?id=flight-3")
  → Browser navigates to /booking?id=flight-3

Step 2: Booking page load
  → BookingContent mounts
  → useEffect: reads sessionStorage("omnifare_flights")
  → Finds flight with id === "flight-3"
  → setFlight(found)

  If NOT found:
  → setNotFound(true)
  → Shows "Flight not found" message + "Back to Search" button
  → END FLOW

Step 3: Flight summary renders
  → Shows airline logo, name, flight number
  → Route: DEL 8:34 AM ——— BLR 11:29 AM
  → Duration, stops, CO₂, baggage info

Step 4: BookingProviders mounts
  → Receives posOptions from flight
  → useEffect runs immediately

  POST /api/geoarb/booking-options
  Body: {
    items: [
      // Top 3 cheapest POS options that have a bookingToken
      { booking_token: "token-TR", country_code: "TR", currency: "INR" },
      { booking_token: "token-IN", country_code: "IN", currency: "INR" },
      { booking_token: "token-AE", country_code: "AE", currency: "INR" },
    ]
  }

  Backend calls /api/geoarb/booking-details for each token in parallel
  Returns: {
    results: [
      {
        posCountryCode: "TR",
        posCountryName: "Turkey",
        options: [
          { title: "Cleartrip", website: "cleartrip.com", price: 6200, token: "..." },
          { title: "MakeMyTrip", website: "makemytrip.com", price: 6350, token: "..." }
        ]
      },
      { posCountryCode: "IN", options: [...] },
      { posCountryCode: "AE", options: [...] },
    ]
  }

  Deduplication: by provider title, keep cheapest price
  → If "Cleartrip" appears in both TR and IN, keep the TR one (cheaper)

  setProviders(deduplicated, sorted by price)

  UI shows provider list:
  - Cleartrip (🇹🇷 Turkey, VPN recommended) — ₹6,200 — Continue
  - MakeMyTrip (🇮🇳 India) — ₹7,450 — Continue
  - Akasa Air (🇮🇳 India) — ₹7,800 — Continue

Step 5: User clicks "Continue" on Cleartrip (Turkey)

  handleContinue(option) called:

  Step 5a: Usage check
  → incrementUsage() called
  → if not logged in: show AuthModal, return false
  → if unlimited: return true immediately
  → if over quota: show UsageLimitModal, return false
  → DB UPDATE profiles SET api_calls_made = N+1
  → return true

  Step 5b: VPN check (countryCode "TR" !== homeCountry "IN")
  → vpnDialog opens: "VPN Recommended for Turkey"
  → User clicks "Continue to Booking"
  → vpnDialog closes
  → doBooking(option) called

Step 6: doBooking(option)
  → newTab = window.open("about:blank", "_blank")  // Synchronous! Avoids popup blocker
  → newTab shows loading message: "✈️ OmniFare — Fetching your booking link…"
  → setLoadingToken(option.token.slice(0, 20))

  POST /api/geoarb/booking
  Body: {
    token: option.token,
    currency: "INR",
    country_code: "TR"
  }

  Backend calls DataCrawler getBookingURL
  Returns: { booking_url: "https://www.cleartrip.com/flights/book?...verylongtoken..." }

  If booking_url present:
  → newTab.location.href = data.booking_url
  → User lands on Cleartrip booking page for the flight
  → setLoadingToken(null)

  If NO booking_url:
  → newTab.close()
  → setBookingError("Could not retrieve booking URL. Please try a different provider.")
  → setLoadingToken(null)
```

---

## Flow 8: Back Navigation (Cache Hit)

```
User is on /booking page
User clicks "Back" in browser

→ Navigates back to /results?from=DEL&to=BLR&date=2026-03-17

ResultsContent.fetchFlights() runs via useEffect

Step 1: Check sessionStorage cache
  → key: "omnifare_flights_DEL_BLR_2026-03-17"
  → FOUND (was saved during the earlier search)
  → setFlights(cached)
  → setLoading(false)
  → RETURNS EARLY — no API call made

User sees results immediately with no loading spinner.
The 8 parallel POS API calls are NOT repeated.
```

---

## Flow 9: Usage Limit Reached

```
User clicks "Continue" on a booking provider

handleContinue() → incrementUsage()
  → apiCallsMade (e.g. 1000) >= maxApiLimit (1000)
  → setShowUsageLimitModal(true)
  → return false
  → handleContinue returns, booking aborted

UsageLimitModal opens:
  "You've used 1000 of 1000 API calls this month."
  [Request More Access] → mailto:rraj.official5@gmail.com
  [Close]

User cannot book until:
  a) Monthly reset (api_calls_made reset to 0 in DB)
  b) Limit increase (max_api_limit increased in DB by admin)
```

---

## Flow 10: Calendar Price Heatmap

```
User opens date picker in SearchBar

Condition: origin AND destination are both set (e.g. DEL and BLR)
  → useEffect fires
  → POST /api/geoarb/calendar { origin: "DEL", destination: "BLR" }

Backend:
  → Calls DataCrawler getCalendarPicker for 30 days
  → Also calls for destination POS (GeoArb aware)
  → Overlays results
  → Returns prices per date

Response: {
  prices: {
    "2026-03-10": 4200,
    "2026-03-11": 4850,
    "2026-03-12": 5500,
    "2026-03-13": 4100,
    ...
  }
}

PriceCalendar receives livePrices prop
  → For each day cell:
    if price < 4800: green label (₹4.2k)
    if price < 5800: blue label (₹4.9k)
    else: red label (₹5.5k)

User selects cheapest date (green one)
  → onSelect called with Date object
  → setDepartureDate(date) in AppState
```

---

## Flow 11: Country/Currency Change

```
User opens Navbar
User selects "USA" from country dropdown

→ onCountryChange("US") called in Navbar
→ setHomeCountry("US")   → AppState.homeCountry = "US"
→ setPreferredCurrency("USD")   → AppState.preferredCurrency = "USD"

Effect on FlightCard:
  → convertedPrice = convertCurrency(price, "USD")
  → formatPrice(convertedPrice, "USD") → "$89.40"
  → showFxFee check: displayPOS.countryCode !== "US"
    (now false for US POS bookings → no FX fee shown for US options)

Effect on Results page route cards:
  → All prices displayed in USD with $ symbol

User can also independently change currency selector:
  → setCurrencyOnly("GBP")
  → Prices shown in GBP but homeCountry remains "US"
```

---

## Error Flows

### API Error on Search

```
POST /api/geoarb/search returns 500 or network fails

→ catch block in fetchFlights
→ setError("Failed to fetch flights: [error message]")
→ setLoading(false)
→ UI shows error card:
    AlertCircle icon
    "Could not load flights"
    [error message]
    [Try Again] button → calls fetchFlights(undefined, true) (force refresh)
```

### No Flights Found

```
POST /api/geoarb/search returns 200 but flights.length === 0

→ setFlights([])
→ setLoading(false)
→ UI shows:
    "No flights found for this route and date"
    [Search Again] button
```

### Booking URL Unavailable

```
POST /api/geoarb/booking returns 200 but no booking_url

→ newTab.close()
→ setBookingError("Could not retrieve booking URL. Please try a different provider.")
→ Error shown inline in the provider list
→ User can try a different provider
```

### Session Expired / Not Found on Booking Page

```
User directly navigates to /booking?id=flight-3 (no sessionStorage)

→ sessionStorage("omnifare_flights") is null OR flight id not found
→ setNotFound(true)
→ UI shows: "Flight not found. Your session may have expired."
→ [Back to Search] → router.push("/")
```
