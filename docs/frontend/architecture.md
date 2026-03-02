# Architecture

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14 (App Router) | File-based routing, RSC-ready |
| Language | TypeScript | Strict types throughout |
| Styling | Tailwind CSS v4 | Custom design tokens, dark-only |
| UI Components | shadcn/ui | Radix primitives, navy-themed |
| Animations | Framer Motion | Page transitions, collapsible cards |
| Icons | Lucide React | Consistent icon set |
| Date handling | date-fns | Calendar, formatting |
| Auth & DB | Supabase | Google OAuth + PostgreSQL |
| State | React Context | Two contexts: AppState + Auth |

---

## Folder Structure

```
omnifare/
├── app/                          # Next.js App Router pages + API routes
│   ├── layout.tsx                # Root layout (fonts, dark mode, Providers)
│   ├── page.tsx                  # Home page (/)
│   ├── providers.tsx             # Client-side provider tree + shell UI
│   ├── globals.css               # Design tokens, global styles
│   ├── icon.svg                  # Favicon (airplane SVG)
│   ├── results/
│   │   └── page.tsx              # Results page (/results)
│   ├── booking/
│   │   └── page.tsx              # Booking page (/booking)
│   ├── auth/
│   │   └── callback/route.ts     # Supabase OAuth redirect handler
│   └── api/geoarb/               # Backend API routes (Next.js Route Handlers)
│       ├── search/route.ts       # POST - flight search (8 POS)
│       ├── calendar/route.ts     # POST - calendar price grid
│       ├── booking/route.ts      # POST - get booking redirect URL
│       ├── booking-details/route.ts # POST - get providers for one token
│       ├── booking-options/route.ts # POST - batch provider fetch
│       └── health/route.ts       # GET  - health check
│
├── components/
│   ├── omni/                     # OmniFare-specific components
│   │   ├── HeroSection.tsx
│   │   ├── SearchBar.tsx
│   │   ├── FlightCard.tsx
│   │   ├── ResultsFilter.tsx
│   │   ├── PriceCalendar.tsx
│   │   ├── Navbar.tsx
│   │   ├── BookingProviders.tsx  # Active booking page component
│   │   ├── POSTable.tsx          # Legacy booking component (not on booking page)
│   │   ├── BudgetTracker.tsx
│   │   ├── AuthModal.tsx
│   │   ├── UsageLimitModal.tsx
│   │   └── ProviderIcon.tsx
│   └── ui/                       # shadcn/ui components (generated)
│       ├── alert-dialog.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── calendar.tsx          # shadcn Calendar (not used; PriceCalendar is custom)
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── popover.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       └── tooltip.tsx
│
├── hooks/
│   ├── useAppState.tsx           # Form state + user preferences (React Context)
│   └── useAuth.tsx               # Supabase auth + usage tracking (React Context)
│
├── lib/
│   ├── mockFlights.ts            # TypeScript types + static data + client-side FX
│   ├── exchangeRate.ts           # Server-side live FX rate service
│   ├── apiConstants.ts           # Supported POS country/currency code sets
│   ├── supabaseClient.ts         # Client-side Supabase singleton
│   ├── supabaseServer.ts         # Server-side Supabase singleton
│   ├── flightApiService.ts       # RapidAPI DataCrawler integration (server only)
│   ├── geoArbEngine.ts           # GeoArb POS selection algorithm (server only)
│   └── utils.ts                  # cn() utility for class composition
│
├── scripts/                      # Dev scripts
│   ├── verify_phase1.sh          # curl-based DB health check
│   ├── test-geoarb.ts            # GeoArb engine test
│   └── verify-api.ts             # Live API verification
│
└── public/                       # Static assets (standard Next.js placeholders)
```

---

## Context Architecture

There are two React Contexts, nested inside each other in `app/providers.tsx`:

```
<AuthProvider>                 // useAuth.tsx — Supabase session, usage tracking
  <AppStateProvider>           // useAppState.tsx — form state, preferences
    <TooltipProvider>          // shadcn tooltip context
      <Navbar />
      <main>{children}</main>
      <footer />
      <BudgetTracker />
      <AuthModal />
      <UsageLimitModal />
    </TooltipProvider>
  </AppStateProvider>
</AuthProvider>
```

### Why two contexts?
- **`AuthProvider`** deals with identity and server state (Supabase session, DB queries). It's heavier and should wrap everything.
- **`AppStateProvider`** is pure in-memory UI state (form fields). It's lightweight and fast.

---

## Routing

| Route | Page | Notes |
|-------|------|-------|
| `/` | `app/page.tsx` | Landing, search, recent routes |
| `/results?from=&to=&date=` | `app/results/page.tsx` | Search results |
| `/booking?id=` | `app/booking/page.tsx` | Flight booking options |
| `/auth/callback` | `app/auth/callback/route.ts` | OAuth redirect, not a page |

All pages are `"use client"` components (or contain client components) because they use React state and context. Pages that need search params use `useSearchParams()` wrapped in `<Suspense>`.

---

## Data Architecture

### Types (defined in `lib/mockFlights.ts`)

```typescript
Flight {
  id: string
  airline: string
  airlineLogo: string            // URL or empty string
  departure/arrival: string      // Formatted time "8:34 AM"
  departureCode/arrivalCode: string
  departureAirport/arrivalAirport: string
  departureDate: string          // Formatted "Tue, Mar 17"
  duration: string               // "2 hr 55 min"
  stops: number
  stopLocations?: string[]
  co2Emissions: number           // kg
  emissionsChange?: string
  cabinClass: string
  legs: FlightLeg[]
  posOptions: POSOption[]        // The core GeoArb data
  baggageInfo: { carryOn, checkedBag }
}

POSOption {
  countryCode: string            // ISO 2-letter: "TR", "IN", "US"
  countryName: string            // "Turkey"
  flagEmoji: string              // "🇹🇷"
  price: number                  // Price in INR (always)
  currency: string               // Typically "INR" on frontend
  provider: string               // OTA name: "MakeMyTrip", "Cleartrip"
  providerLogo?: string          // Favicon URL or null
  providerWebsite?: string       // "https://www.makemytrip.com"
  bookingToken?: string          // Token for getBookingDetails API
  riskLevel: "low" | "medium"
  riskNote?: string
}
```

### Data Sources

| Data | Source | When |
|------|--------|------|
| Flight list | `POST /api/geoarb/search` | On results page mount |
| Calendar prices | `POST /api/geoarb/calendar` | When origin+destination set in SearchBar |
| Provider names | `POST /api/geoarb/booking-options` | On booking page mount |
| Booking URL | `POST /api/geoarb/booking` | When user clicks Continue |
| FX rates | Static map in `mockFlights.ts` | Client-side, synchronous |
| Auth session | Supabase | On app mount via `useAuth` |
| Usage stats | Supabase `profiles` table | On auth state change |
| Recent routes | sessionStorage | On home page mount |
| Flight cache | sessionStorage | On results page mount (skip re-fetch) |

---

## Key Design Decisions

### 1. Prices always in INR on the frontend
All `POSOption.price` values coming from the API are in INR. The `convertCurrency()` function in `mockFlights.ts` applies a static exchange rate table to convert to the user's preferred currency for display only. The backend does the real conversion; the frontend re-converts using a simplified static map.

### 2. sessionStorage as inter-page "database"
The booking page does not fetch flights again. It reads from `sessionStorage("omnifare_flights")` written by the results page. This avoids redundant API calls and preserves the exact data the user saw on the results page.

### 3. Usage tracking at booking step only
`incrementUsage()` is called only when the user clicks "Continue" to book — not on flight search. This gives generous search behavior while metering the higher-cost booking operations.

### 4. Popup-blocker workaround
`window.open("about:blank")` is called synchronously in the click handler before any async operations. The new tab's `location.href` is updated after the booking URL is fetched. This is the standard workaround for browser popup blockers.

### 5. AbortController for search fetch
The results page uses `AbortController` to cancel the in-flight search request if the component re-renders (React StrictMode double-invocation) or if the user navigates away. This prevents duplicate API calls consuming quota.

### 6. BookingProviders vs POSTable
Two components do similar things. `POSTable` is the original component that works with a full `Flight` object and shows all POS options. `BookingProviders` is the newer component on the booking page that accepts just `POSOptionBrief[]`, calls the booking-options API to enrich with real OTA names, and shows only verified, live provider options. Only `BookingProviders` is used on the live `/booking` page.
