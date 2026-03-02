# Pages

## Overview

OmniFare has three user-facing pages, all client-side (`"use client"`) since they consume React Context and browser APIs.

---

## `app/layout.tsx` — Root Layout

### Purpose
Root Next.js layout that establishes HTML structure, loads fonts, sets metadata, and wraps the entire app in the provider tree.

### Metadata
```typescript
{
  title: "OmniFare — Global POS Flight Search",
  description: "Find the cheapest flights by comparing prices across every Point of Sale worldwide."
}
```

### Font Loading
Uses Next.js `next/font/google` to load two Geist font variants:
- **Geist Sans** → CSS variable `--font-geist-sans`
- **Geist Mono** → CSS variable `--font-geist-mono`

Both are applied as class names on the `<body>` element.

### Dark Mode
The `<html>` element always has `className="dark"`. The app is **dark-only** — there is no light mode toggle or media query.

### Provider Wrapping
All `{children}` are wrapped in `<Providers>` which injects the global context tree, Navbar, footer, and modals. See `providers.tsx` below.

---

## `app/providers.tsx` — Provider Shell

### Purpose
Client-side component that composes all global contexts and renders the persistent shell UI that appears on every page: Navbar, footer, global modals, and the usage tracker.

### Provider Nesting (outer → inner)
```
AuthProvider         (useAuth.tsx)
  AppStateProvider   (useAppState.tsx)
    TooltipProvider  (shadcn)
      Navbar
      <main>{children}</main>
      <footer>
      BudgetTracker
      AuthModal
      UsageLimitModal
```

### Footer Content
```jsx
<footer className="border-t border-[rgba(59,130,246,0.15)] bg-navy-950 px-6 py-4">
  <span>© 2025 OmniFare. All rights reserved.</span>
  <span>Made with ♥ by Rohit</span>
  <a href="https://github.com/rraj-official">GitHub</a>
  <span>rraj.official5@gmail.com</span>
</footer>
```

### Why providers.tsx is separate from layout.tsx
`layout.tsx` is a Server Component by default in Next.js App Router. React Context providers must be Client Components (`"use client"`). Separating them follows the Next.js recommended pattern.

---

## `app/page.tsx` — Home Page (`/`)

### Purpose
Landing page. Shows the animated hero, the search bar, and either recent searches (from sessionStorage) or hardcoded popular routes.

### Component Signature
```typescript
export default function Home(): JSX.Element
```

### Consumed Contexts
- `useAppState()` → `preferredCurrency`
- `useRouter()` → for navigating to `/results` when a route card is clicked

### Local State
```typescript
const [recentRoutes, setRecentRoutes] = useState<RecentRoute[]>([])
```

### `RecentRoute` Interface
```typescript
interface RecentRoute {
  from: string           // IATA code e.g. "DEL"
  to: string             // IATA code e.g. "BLR"
  fromCity: string       // "Delhi"
  toCity: string         // "Bangalore"
  date: string           // "2026-03-17"
  cheapestPrice: number  // Price in INR
  cheapestCountry: string  // "Turkey"
  cheapestCountryCode?: string  // "TR"
  cheapestFlag: string   // "🇹🇷"
  currency: string       // "INR"
  savedAt: number        // Date.now() timestamp
}
```

### useEffect — Load Recent Routes
```typescript
useEffect(() => {
  const stored = sessionStorage.getItem("omnifare_recent_routes")
  if (stored) setRecentRoutes(JSON.parse(stored))
}, [])
```
Runs once on mount. No dependencies. No cleanup needed.

### Route Card Navigation
```typescript
function handleRouteClick(route: RecentRoute) {
  router.push(`/results?from=${route.from}&to=${route.to}&date=${route.date}`)
}
```

### Rendered Sections

#### 1. Hero + Search Bar
```jsx
<HeroSection />
<SearchBar />       // Centered, overlaps hero bottom
```

#### 2. Recent / Popular Routes Grid
```jsx
// If recentRoutes.length > 0: render user's recent searches
// Else: render 4 hardcoded popular Indian routes

{recentRoutes.map(route => (
  <div onClick={() => handleRouteClick(route)}>
    {route.fromCity} → {route.toCity}
    <span>{route.cheapestFlag} Save ~{formatPrice(saving, preferredCurrency)}</span>
    // Note: "Save ~X" is conditionally hidden if cheapestCountryCode === homeCountry
    <span>From {formatPrice(convertCurrency(route.cheapestPrice, preferredCurrency), preferredCurrency)}</span>
  </div>
))}
```

**Hardcoded popular routes** (shown only when no recent routes):
- DEL → BLR (Delhi → Bangalore)
- BOM → DEL (Mumbai → Delhi)
- DEL → DXB (Delhi → Dubai)
- BLR → SIN (Bangalore → Singapore)

#### 3. Features Grid
Four static info cards:
| Icon | Title | Description |
|------|-------|-------------|
| Globe | Global POS Comparison | 190+ countries |
| TrendingDown | Price Tracking | Track fares |
| Route | Smart Routing | AI-powered recommendations |
| Shield | Risk Assessment | Low/medium risk labels |

### Data Persistence
- **Reads** from `sessionStorage("omnifare_recent_routes")` on mount
- **Does not write** — recent routes are written by `app/results/page.tsx`

---

## `app/results/page.tsx` — Results Page (`/results`)

### Purpose
The main flight search results page. Fetches flights from the backend API, applies client-side filters, renders a paginated list of `FlightCard` components.

### Component Signature
```typescript
// Public export wraps inner component in Suspense (required for useSearchParams)
export default function ResultsPage(): JSX.Element

// Inner component with all the logic
function ResultsContent(): JSX.Element
```

### URL Parameters (read via `useSearchParams`)
| Param | Example | Required |
|-------|---------|---------|
| `from` | `DEL` | Yes |
| `to` | `BLR` | Yes |
| `date` | `2026-03-17` | Yes |

### Consumed Contexts
- `useAppState()` → `preferredCurrency`, `noFxFeeCard`, `homeCountry`

### State Variables
```typescript
const [flights, setFlights]         = useState<Flight[]>([])
const [loading, setLoading]         = useState(true)
const [error, setError]             = useState<string | null>(null)
const [posStats, setPosStats]       = useState<any>(null)
const [page, setPage]               = useState(1)          // Pagination
const [stopsFilter, setStopsFilter] = useState("any")      // "any"|"0"|"1"|"2+"
const [sortBy, setSortBy]           = useState("price")    // "price"|"duration"|"emissions"
const [airlineFilter, setAirlineFilter] = useState("all")  // "all"|airline name
const [timeFilter, setTimeFilter]   = useState("any")      // "any"|"morning"|"afternoon"|"evening"
```

### Constants
```typescript
const PAGE_SIZE = 10  // Results per page
```

### Core Function: `fetchFlights(signal?, forceRefresh?)`

```typescript
const fetchFlights = useCallback(async (signal?: AbortSignal, forceRefresh = false) => {
  // 1. Check sessionStorage cache (avoids re-fetch on back navigation)
  const cacheKey = `omnifare_flights_${from}_${to}_${date}`
  if (!forceRefresh) {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      setFlights(JSON.parse(cached))
      setLoading(false)
      return
    }
  }

  // 2. Call API
  const res = await fetch("/api/geoarb/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      origin: from,
      destination: to,
      date,
      user_currency: "INR",
      cabin_class: "economy",
      passengers: 1,
    }),
  })

  // 3. Map raw API response to Flight interface
  const mapped = data.flights.map((f, idx) => mapApiToFlight(f, idx, date))

  // 4. Visual dedup: same airline + departure + arrival + stops → keep most POS options
  const seen = new Map<string, Flight>()
  for (const f of mapped) {
    const key = `${f.airline}-${f.departure}-${f.arrival}-${f.stops}`
    const existing = seen.get(key)
    if (!existing || f.posOptions.length > existing.posOptions.length) {
      seen.set(key, f)
    }
  }
  const deduped = Array.from(seen.values())

  // 5. Write to sessionStorage (3 keys)
  sessionStorage.setItem(cacheKey, JSON.stringify(deduped))
  sessionStorage.setItem("omnifare_flights", JSON.stringify(deduped))
  sessionStorage.setItem("omnifare_source", data.source ?? "live")

  // 6. Save cheapest result to recent routes (for home page)
  // ... see "Recent Routes Persistence" section below
}, [from, to, date])
```

### Helper: `mapApiToFlight(apiFlight, idx, date)`

Converts the raw API response object to the `Flight` interface:

```typescript
function mapApiToFlight(apiFlight: any, idx: number, date: string): Flight {
  return {
    id: `flight-${idx}`,
    airline: apiFlight.legs?.[0]?.airline ?? "Unknown",
    airlineLogo: apiFlight.airline_logo ?? "",
    departure: fmtTime(apiFlight.legs?.[0]?.departure_datetime),
    arrival: fmtTime(apiFlight.legs?.[apiFlight.legs.length - 1]?.arrival_datetime),
    departureCode: apiFlight.legs?.[0]?.departure_airport ?? from,
    arrivalCode: apiFlight.legs?.[apiFlight.legs.length - 1]?.arrival_airport ?? to,
    departureAirport: apiFlight.legs?.[0]?.departure_airport_name ?? "",
    arrivalAirport: apiFlight.legs?.[apiFlight.legs.length - 1]?.arrival_airport_name ?? "",
    departureDate: fmtDate(apiFlight.legs?.[0]?.departure_datetime ?? date),
    duration: fmtMins(apiFlight.duration_mins ?? 0),
    stops: (apiFlight.legs?.length ?? 1) - 1,
    stopLocations: apiFlight.legs?.slice(1, -1).map((l: any) => l.departure_airport),
    co2Emissions: apiFlight.co2_emissions_kg ?? 0,
    emissionsChange: apiFlight.emissions_change,
    cabinClass: "economy",
    legs: (apiFlight.legs ?? []).map((leg: any) => ({
      departureTime: fmtTime(leg.departure_datetime),
      arrivalTime: fmtTime(leg.arrival_datetime),
      departureAirport: leg.departure_airport_name ?? leg.departure_airport,
      departureCode: leg.departure_airport,
      arrivalAirport: leg.arrival_airport_name ?? leg.arrival_airport,
      arrivalCode: leg.arrival_airport,
      duration: fmtMins(leg.duration_mins ?? 0),
      aircraft: leg.aircraft ?? "",
      flightNumber: leg.flight_number ?? "",
    })),
    posOptions: (apiFlight.pos_options ?? [])
      .filter((p: any) => p.price > 0)    // Filter out zero-price entries
      .map((p: any) => ({
        countryCode: p.country_code,
        countryName: p.country_name,
        flagEmoji: p.flag_emoji,
        price: p.price,
        currency: p.currency ?? "INR",
        provider: p.provider ?? "",
        providerLogo: p.provider_logo ?? null,
        providerWebsite: p.provider_website ?? null,
        bookingToken: p.booking_token ?? null,
        riskLevel: p.risk_level ?? "low",
        riskNote: p.risk_note ?? null,
      })),
    baggageInfo: {
      carryOn: apiFlight.carry_on ?? true,
      checkedBag: apiFlight.checked_bag ?? false,
    },
  }
}
```

### Helper Functions
```typescript
// Format ISO datetime to "8:34 AM"
function fmtTime(dt: string): string

// Format minutes integer to "2 hr 55 min"
function fmtMins(mins: number): string

// Format ISO date to "Tue, Mar 17"
function fmtDate(dt: string): string
```

### Client-Side Filtering (`useMemo`)

```typescript
const filtered = useMemo(() => {
  let result = [...flights]

  // 1. Stops filter
  if (stopsFilter !== "any") {
    const target = parseInt(stopsFilter)
    result = result.filter(f =>
      stopsFilter === "2+"
        ? f.stops >= 2
        : f.stops === target
    )
  }

  // 2. Airline filter
  if (airlineFilter !== "all") {
    result = result.filter(f => f.airline === airlineFilter)
  }

  // 3. Time filter
  if (timeFilter !== "any") {
    result = result.filter(f => {
      const hour = parseInt(f.departure.split(":")[0])  // 0-23
      if (timeFilter === "morning")   return hour >= 6  && hour < 12
      if (timeFilter === "afternoon") return hour >= 12 && hour < 18
      if (timeFilter === "evening")   return hour >= 18
      return true
    })
  }

  // 4. Sort
  if (sortBy === "price") {
    result.sort((a, b) => {
      const pa = getCheapestPOS(a).price
      const pb = getCheapestPOS(b).price
      return pa - pb
    })
  } else if (sortBy === "duration") {
    result.sort((a, b) => parseDuration(a.duration) - parseDuration(b.duration))
  } else if (sortBy === "emissions") {
    result.sort((a, b) => a.co2Emissions - b.co2Emissions)
  }

  return result
}, [flights, stopsFilter, airlineFilter, timeFilter, sortBy])
```

### Pagination
```typescript
const ITEMS_PER_PAGE = 10
const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
```
Pagination resets to page 1 whenever filters change.

### Recent Routes Persistence
After a successful fetch, the page saves the cheapest result to `sessionStorage("omnifare_recent_routes")`:

```typescript
const cheapestFlight = [...mapped].sort((a, b) =>
  getCheapestPOS(a).price - getCheapestPOS(b).price
)[0]

const cheapestPOS = getCheapestPOS(cheapestFlight)
const fromAirport = airports.find(a => a.code === from)
const toAirport   = airports.find(a => a.code === to)

const newRoute: RecentRoute = {
  from, to,
  fromCity:  fromAirport?.city ?? from,
  toCity:    toAirport?.city ?? to,
  date,
  cheapestPrice:       cheapestPOS.price,
  cheapestCountry:     cheapestPOS.countryName,
  cheapestCountryCode: cheapestPOS.countryCode,  // Used to suppress FX fee on home page
  cheapestFlag:        cheapestPOS.flagEmoji,
  currency: "INR",
  savedAt: Date.now(),
}

// Get existing routes, prepend new, deduplicate by from+to, limit to 4
const existing = JSON.parse(sessionStorage.getItem("omnifare_recent_routes") ?? "[]")
const deduped  = [newRoute, ...existing.filter(r => !(r.from === from && r.to === to))]
sessionStorage.setItem("omnifare_recent_routes", JSON.stringify(deduped.slice(0, 4)))
```

### useEffect — Data Loading
```typescript
useEffect(() => {
  const controller = new AbortController()
  fetchFlights(controller.signal)
  return () => controller.abort()
}, [fetchFlights])
```

### Rendered Structure
```jsx
<div className="min-h-screen bg-navy-950">
  <SearchBar compact />            // Inline search bar (no hero overlap)

  {loading && <FlightSkeleton />}  // 5x skeleton cards
  {error && <ErrorMessage />}
  {!loading && !error && (
    <>
      <ResultsFilter ... />        // Filter dropdowns
      <PosStats />                 // "Searched X POS countries" info bar
      {paginated.map(flight => (
        <FlightCard key={flight.id} flight={flight} />
      ))}
      <Pagination />               // Page 1 of N buttons
    </>
  )}
</div>
```

### Local Sub-component: `FlightSkeleton`
Renders 5 animated pulse skeleton cards during loading.

---

## `app/booking/page.tsx` — Booking Page (`/booking?id=`)

### Purpose
Shows the selected flight's details and a list of live booking providers fetched from the API. The user picks a provider and clicks Continue to be redirected to the booking site.

### Component Signature
```typescript
export default function BookingPage(): JSX.Element   // wraps in <Suspense>
function BookingContent(): JSX.Element               // actual implementation
```

### URL Parameters
| Param | Example | Required |
|-------|---------|---------|
| `id` | `flight-3` | Yes |

### State
```typescript
const [flight, setFlight]       = useState<Flight | null>(null)
const [notFound, setNotFound]   = useState(false)
```

### Data Loading
```typescript
useEffect(() => {
  const id = searchParams.get("id")
  if (!id) { setNotFound(true); return }

  const stored = sessionStorage.getItem("omnifare_flights")
  if (!stored) { setNotFound(true); return }

  const flights: Flight[] = JSON.parse(stored)
  const found = flights.find(f => f.id === id)
  if (!found) { setNotFound(true); return }

  setFlight(found)
}, [searchParams])
```

### Not-Found State
If `id` is missing or not found in sessionStorage, renders:
```jsx
<div>
  <PlaneTakeoff icon />
  <h2>Flight not found</h2>
  <p>Your session may have expired. Please search again.</p>
  <Button onClick={() => router.push("/")}>Back to Search</Button>
</div>
```

### Flight Summary Card
Renders a read-only flight summary:
- Back navigation button (`router.back()`)
- `<AirlineLogoSmall>` — logo with initials fallback
- Airline name, flight number, cabin class
- Route: `DEL 8:34 AM ——— BLR 11:29 AM`
- Duration, stops count, CO₂ emissions
- Baggage: carry-on ✓ / checked bag ✓ or ✗

### Internal Sub-component: `AirlineLogoSmall`
```typescript
function AirlineLogoSmall({ airline, airlineLogo }: { airline: string, airlineLogo: string })
```
Renders `<img>` from `airlineLogo` URL with `onError` fallback to a 2-letter colored badge. Color is deterministic based on `airline` string length modulo a color array.

### Booking Options
```jsx
<BookingProviders posOptions={flight.posOptions} />
```
Passes the raw `posOptions` from the `Flight` object. `BookingProviders` takes care of fetching the actual provider names and booking URLs.

### No API calls made directly
The booking page itself makes no API calls — it only reads from sessionStorage and delegates to `BookingProviders`.
