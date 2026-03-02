# State Management

OmniFare uses a straightforward two-context architecture: one for search/UI state and one for authentication. There is no Redux, Zustand, or other state library.

---

## Context Architecture

```
AuthProvider (useAuth.tsx)
  └── AppStateProvider (useAppState.tsx)
        └── TooltipProvider (shadcn)
              └── App UI
```

**AuthProvider** is outermost because AppState components (SearchBar, FlightCard) need to read auth state (`isLoggedIn`) to gate the search action.

---

## Context 1: `AppStateProvider`

### Location
`hooks/useAppState.tsx`, mounted in `app/providers.tsx`

### Scope
In-memory only. No localStorage/sessionStorage. Resets on page refresh.

### State Map

```
AppStateProvider
├── homeCountry: "IN"           ← Set by Navbar country selector
├── preferredCurrency: "INR"    ← Set by Navbar currency selector (auto-synced with country)
├── origin: "DEL"               ← Set by SearchBar origin picker
├── destination: ""             ← Set by SearchBar destination picker
├── departureDate: Date         ← Set by SearchBar date picker
├── returnDate: Date            ← Set by SearchBar return date picker
├── passengers: 1               ← Set by SearchBar passenger counter
├── cabinClass: "economy"       ← Set by SearchBar cabin class select
├── tripType: "one-way"         ← Set by SearchBar trip type select
└── noFxFeeCard: false          ← Set by FX fee checkbox in FlightCard/BookingProviders
```

### Who Reads What

| Component | Reads | Writes |
|-----------|-------|--------|
| `SearchBar` | origin, destination, departureDate, returnDate, passengers, cabinClass, tripType | All of the above |
| `Navbar` | homeCountry, preferredCurrency | homeCountry, preferredCurrency |
| `FlightCard` | preferredCurrency, noFxFeeCard, homeCountry | noFxFeeCard |
| `BookingProviders` | preferredCurrency, noFxFeeCard, homeCountry | noFxFeeCard |
| `POSTable` | preferredCurrency, noFxFeeCard, homeCountry | noFxFeeCard |
| `ResultsContent` | preferredCurrency | — |
| `Home (page.tsx)` | preferredCurrency | — |

### State Linkages

**Country → Currency auto-sync (Navbar)**
When `homeCountry` changes via the country selector, `preferredCurrency` is automatically updated to that country's currency:
```typescript
const country = countries.find(c => c.code === newCode)
if (country) setPreferredCurrency(country.currency)
```

**`noFxFeeCard` affects FX fee display everywhere**
When the user checks "I have a No FX fee card" (a checkbox in FlightCard/BookingProviders), `setNoFxFeeCard(true)` is called. Since this is context state, all FlightCards and BookingProviders across the app immediately stop showing the "est. FX fee" line.

**`homeCountry` affects FX fee display per-POS**
```typescript
const showFxFee = !noFxFeeCard && displayPOS.countryCode !== homeCountry
```
If the price is sourced from the user's home country POS, no FX fee is shown (booking in your home currency doesn't incur a foreign transaction fee).

---

## Context 2: `AuthProvider`

### Location
`hooks/useAuth.tsx`, mounted in `app/providers.tsx` (outermost)

### Scope
Backed by Supabase — session persists across page reloads via Supabase's localStorage-based session storage.

### State Map

```
AuthProvider
├── session: Supabase Session | null   ← From supabase.auth.getSession()
├── loading: boolean                   ← true until first session check completes
├── showAuthModal: boolean             ← Controls AuthModal visibility
├── showUsageLimitModal: boolean       ← Controls UsageLimitModal visibility
├── apiCallsMade: number               ← From Supabase profiles table
└── maxApiLimit: number                ← From Supabase profiles table
```

Derived (computed, not state):
```typescript
const isLoggedIn   = !!session?.user
const isUnlimited  = UNLIMITED_EMAILS.includes(session?.user?.email)
const user         = { name, email, avatar }  // derived from session
```

### State Transitions

```
Initial:          loading=true, session=null
After getSession: loading=false, session=(null|Session)
After sign-in:    session=Session, showAuthModal=false
After sign-out:   session=null
After profile fetch: apiCallsMade=N, maxApiLimit=M
After increment:  apiCallsMade=N+1
Limit reached:    showUsageLimitModal=true
```

---

## sessionStorage Patterns

sessionStorage is used for cross-page data transfer and short-lived caching. It's scoped to the browser tab and cleared on tab close.

### Keys Used

| Key | Written By | Read By | Purpose |
|-----|-----------|---------|---------|
| `omnifare_flights` | `results/page.tsx` | `booking/page.tsx` | All flight objects for the current search |
| `omnifare_source` | `results/page.tsx` | `booking/page.tsx` | "live" or "mock" — data source indicator |
| `omnifare_flights_{from}_{to}_{date}` | `results/page.tsx` | `results/page.tsx` | Route-specific cache, prevents re-fetch on Back |
| `omnifare_recent_routes` | `results/page.tsx` | `app/page.tsx` | Recent searches for homepage display |

### `omnifare_flights` Schema

```typescript
// Full array of Flight objects from the most recent search
Flight[]
```

Written when: search results are successfully fetched.  
Read when: booking page mounts and needs to find the selected flight by ID.

**Critical:** The booking page has NO independent API call. It relies entirely on this key. If the user opens `/booking?id=flight-3` directly (no prior search in this tab), they get a "Flight not found" error.

### `omnifare_flights_{from}_{to}_{date}` Schema

```typescript
// Same as omnifare_flights but keyed by route+date for cache lookup
Flight[]
```

Written when: search results are fetched.  
Read when: results page mounts and checks for a cached result before making API calls.  
Purpose: When user navigates Back from the booking page, the results page loads from cache instantly — no API calls, no loading spinner.

### `omnifare_recent_routes` Schema

```typescript
interface RecentRoute {
  from:               string   // "DEL"
  to:                 string   // "BLR"
  fromCity:           string   // "Delhi"
  toCity:             string   // "Bangalore"
  date:               string   // "2026-03-17"
  cheapestPrice:      number   // 6200 (INR)
  cheapestCountry:    string   // "Turkey"
  cheapestCountryCode?: string // "TR"
  cheapestFlag:       string   // "🇹🇷"
  currency:           string   // "INR"
  savedAt:            number   // Date.now() timestamp
}

// Stored as: JSON.stringify(RecentRoute[])  — max 4 entries
```

Written when: results page finishes loading, saves cheapest flight's POS info.  
Read when: home page mounts, shows "Recent routes" section.  
Deduplication: only the most recent search per `from+to` pair is kept.

---

## Local Component State

Beyond the two contexts, individual components manage their own ephemeral UI state:

### `results/page.tsx`
```typescript
flights: Flight[]        // Main data
loading: boolean
error: string | null
page: number             // Current pagination page
stopsFilter: string      // "any"|"0"|"1"|"2+"
sortBy: string           // "price"|"duration"|"emissions"
airlineFilter: string    // "all"|airline name
timeFilter: string       // "any"|"morning"|"afternoon"|"evening"
```
All filter/sort state is local — resetting the page or navigating away clears them.

### `SearchBar.tsx`
```typescript
originOpen: boolean      // Origin airport popover open state
destOpen: boolean        // Destination popover open state
validationError: string  // Inline validation message
calendarPrices: Record<string, number>  // Date → price from API
loadingPrices: boolean   // Calendar fetch in-progress
```

### `FlightCard.tsx`
```typescript
expanded: boolean        // Card collapse/expand toggle
imgError: boolean        // Inside AirlineLogo sub-component
```

### `BookingProviders.tsx`
```typescript
providers: LiveBookingOption[]  // Fetched + deduped booking options
loading: boolean                // Provider fetch in-progress
fetchError: string | null       // Provider fetch error
loadingToken: string | null     // Which provider is being booked
bookingError: string | null     // Booking URL fetch error
vpnDialog: { open, option }     // VPN warning dialog state
```

### `Navbar.tsx`
```typescript
showLogoutConfirm: boolean  // AlertDialog for logout confirmation
```

### `BudgetTracker.tsx`
```typescript
showTooltip: boolean  // Hover tooltip visibility
```

---

## State Update Patterns

### Async state with AbortController

Pattern used in `SearchBar` (calendar) and `ResultsContent` (flights):
```typescript
const controllerRef = useRef<AbortController>()

useEffect(() => {
  controllerRef.current?.abort()           // Cancel any in-flight request
  const controller = new AbortController()
  controllerRef.current = controller

  fetchSomething(controller.signal)

  return () => controller.abort()          // Cleanup on unmount
}, [dependency])
```

This pattern prevents:
- Stale responses updating state after component unmounts
- Duplicate requests when dependency changes rapidly
- React StrictMode double-invocation issues

### Optimistic Updates

`incrementUsage()` in `useAuth` performs an optimistic local update before the DB write:
```typescript
const newCount = apiCallsMade + 1
await supabase.from("profiles").update({ api_calls_made: newCount })
setApiCallsMade(newCount)  // Update local state after DB confirms
```

There is no rollback on DB failure (simplification for low-stakes usage tracking).

### Derived State with useMemo

`ResultsContent` uses `useMemo` for the filtered+sorted results:
```typescript
const filtered = useMemo(() => {
  // Apply all filters + sort
  return result
}, [flights, stopsFilter, airlineFilter, timeFilter, sortBy])
```

This prevents re-computing the filter on every render — only re-runs when the underlying data or filter values change.

---

## State Flow Diagram

```
User Action
    │
    ▼
Context Update (AppStateProvider or AuthProvider)
    │
    ├── Re-renders consuming components (React normal flow)
    │
    └── Side Effects (useEffect dependencies)
          │
          ├── API calls (SearchBar calendar, ResultsContent search)
          │
          └── sessionStorage reads/writes (results saved, booking page reads)
```

---

## Common State Bugs and Their Solutions

### 1. Stale closure in fetchFlights
**Problem:** `fetchFlights` is a `useCallback` that depends on `from`, `to`, `date`. If URL params change, the old closure would use stale values.  
**Solution:** All three params are in the `useCallback` dependency array. When params change, a new function is created, which triggers the `useEffect` to run again.

### 2. Calendar prices shown for wrong route
**Problem:** User selects DEL→BLR, prices load. User then changes destination to DXB — old DEL→BLR prices might flash briefly.  
**Solution:** The useEffect clears `calendarPrices` immediately when either origin or destination is empty, and the AbortController cancels the in-flight request before starting a new one.

### 3. Duplicate flights from React StrictMode
**Problem:** React StrictMode double-invokes effects, causing two simultaneous calls to `POST /api/geoarb/search`, burning API quota.  
**Solution:** AbortController signal is passed to `fetch()`. The first invocation's request is aborted by the second invocation's cleanup function. The second invocation's request completes normally.

### 4. Booking page shows "not found" after Back navigation
**Problem:** `omnifare_flights` in sessionStorage is a different key than the route-specific cache. If the general key is missing, booking breaks.  
**Solution:** The results page always writes both `omnifare_flights` (general) and `omnifare_flights_{from}_{to}_{date}` (route-specific). The booking page reads the general key.

### 5. FX fee shown for home country
**Problem:** If user is in India (homeCountry="IN") and the displayed price is from the Indian POS, showing a "FX fee" is incorrect.  
**Solution:** `showFxFee = !noFxFeeCard && displayPOS.countryCode !== homeCountry`. The condition checks both the user's preference AND the POS country.
