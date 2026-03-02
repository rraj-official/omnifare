# Lib — Frontend Utilities

The `lib/` directory contains both frontend-accessible utilities and server-only modules. This document covers the files relevant to frontend development.

---

## `lib/mockFlights.ts` — Types, Data, and Client-Side FX

This file serves three purposes simultaneously:
1. **TypeScript type definitions** used everywhere in the app
2. **Static reference data** (airports, countries, FX rates)
3. **Client-side utility functions** for price formatting and conversion

Despite the name "mock", this file's types and utilities are used even with live API data.

---

### `Airport` Interface

```typescript
export interface Airport {
  code:    string   // IATA code: "DEL"
  name:    string   // Full airport name: "Indira Gandhi International Airport"
  city:    string   // City name: "Delhi"
  country: string   // Country name: "India"
}
```

Used by:
- `SearchBar.tsx` — populates origin/destination dropdowns
- `results/page.tsx` — resolves city names when saving recent routes

---

### `airports` Array

Current entries (12 airports):

| Code | Name | City | Country |
|------|------|------|---------|
| DEL | Indira Gandhi International | Delhi | India |
| BLR | Kempegowda International | Bangalore | India |
| BOM | Chhatrapati Shivaji Maharaj | Mumbai | India |
| MAA | Chennai International | Chennai | India |
| HYD | Rajiv Gandhi International | Hyderabad | India |
| CCU | Netaji Subhas Chandra Bose | Kolkata | India |
| GOI | Goa International | Goa | India |
| DXB | Dubai International | Dubai | UAE |
| SIN | Singapore Changi | Singapore | Singapore |
| LHR | Heathrow | London | UK |
| JFK | John F. Kennedy International | New York | USA |
| IST | Istanbul Airport | Istanbul | Turkey |

**Note:** This list is intentionally limited to major international airports. For full global support, this array should be expanded (see the planned `lib/airports.ts` migration).

---

### `POSOption` Interface

The core data structure for a single Point-of-Sale booking option:

```typescript
export interface POSOption {
  countryCode:      string              // ISO 2-letter: "TR"
  countryName:      string              // "Turkey"
  flagEmoji:        string              // "🇹🇷"
  price:            number              // Price in INR (always)
  currency:         string              // Typically "INR"
  provider:         string              // OTA name: "Cleartrip" (may be empty for search results)
  providerLogo?:    string | null       // Favicon URL or null
  providerWebsite?: string | null       // "https://www.cleartrip.com"
  bookingToken?:    string | null       // Token for getBookingDetails API
  riskLevel:        "low" | "medium"
  riskNote?:        string | null       // Tooltip text explaining risk
}
```

**Key design note:** All prices are stored in INR internally. The frontend converts to the user's preferred currency at display time using `convertCurrency()`.

---

### `FlightLeg` Interface

```typescript
export interface FlightLeg {
  departureTime:    string   // "8:34 AM"
  arrivalTime:      string   // "11:29 AM"
  departureAirport: string   // "Indira Gandhi International Airport"
  departureCode:    string   // "DEL"
  arrivalAirport:   string   // "Kempegowda International Airport"
  arrivalCode:      string   // "BLR"
  duration:         string   // "2 hr 55 min"
  aircraft:         string   // "Airbus A320"
  flightNumber:     string   // "IX 2679"
}
```

---

### `Flight` Interface

The top-level flight data model:

```typescript
export interface Flight {
  id:               string              // "flight-0", "flight-1", ...
  airline:          string              // "Air India Express"
  airlineLogo:      string              // URL or empty string
  departure:        string              // "8:34 AM" (formatted)
  arrival:          string              // "11:29 AM"
  departureCode:    string              // "DEL"
  arrivalCode:      string              // "BLR"
  departureAirport: string              // Full airport name
  arrivalAirport:   string
  departureDate:    string              // "Tue, Mar 17"
  duration:         string              // "2 hr 55 min"
  stops:            number              // 0, 1, 2
  stopLocations?:   string[]            // Intermediate airport codes
  co2Emissions:     number              // kg
  emissionsChange?: string              // "+5% vs avg"
  cabinClass:       string              // "economy"
  legs:             FlightLeg[]
  posOptions:       POSOption[]         // THE CORE GEOARB DATA
  baggageInfo: {
    carryOn:        boolean
    checkedBag:     boolean
  }
}
```

---

### `countries` Array

9 country entries used for the Navbar country/currency selectors:

```typescript
export const countries = [
  { code: "IN", name: "India",     currency: "INR", symbol: "₹",    flagEmoji: "🇮🇳" },
  { code: "US", name: "USA",       currency: "USD", symbol: "$",    flagEmoji: "🇺🇸" },
  { code: "GB", name: "UK",        currency: "GBP", symbol: "£",    flagEmoji: "🇬🇧" },
  { code: "TR", name: "Turkey",    currency: "TRY", symbol: "₺",    flagEmoji: "🇹🇷" },
  { code: "BR", name: "Brazil",    currency: "BRL", symbol: "R$",   flagEmoji: "🇧🇷" },
  { code: "AE", name: "UAE",       currency: "AED", symbol: "د.إ",  flagEmoji: "🇦🇪" },
  { code: "SG", name: "Singapore", currency: "SGD", symbol: "S$",   flagEmoji: "🇸🇬" },
  { code: "DE", name: "Germany",   currency: "EUR", symbol: "€",    flagEmoji: "🇩🇪" },
  { code: "JP", name: "Japan",     currency: "JPY", symbol: "¥",    flagEmoji: "🇯🇵" },
]
```

---

### `fxRates` — Static Exchange Rates

```typescript
export const fxRates: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  GBP: 0.0095,
  TRY: 0.41,
  BRL: 0.061,
  AED: 0.044,
  SGD: 0.016,
  EUR: 0.011,
  JPY: 1.78,
}
```

**Important:** These are **approximate, hardcoded rates**. They are used for frontend display only. The backend uses live rates from the Frankfurter API (`lib/exchangeRate.ts`) for actual price normalization.

---

### `convertCurrency(amountINR, toCurrency): number`

```typescript
export function convertCurrency(amountINR: number, toCurrency: string): number {
  const rate = fxRates[toCurrency] ?? 1
  return Math.round(amountINR * rate * 100) / 100
}
```

Converts an INR amount to the target currency using static rates. Returns a number rounded to 2 decimal places.

---

### `formatPrice(amount, currency): string`

```typescript
export function formatPrice(amount: number, currency: string): string {
  const country = countries.find(c => c.currency === currency)
  const symbol  = country?.symbol ?? currency

  if (currency === "JPY") {
    return `${symbol}${Math.round(amount).toLocaleString()}`
  }
  return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}
```

Returns formatted strings like `₹7,450`, `$89.40`, `£67.50`, `¥12,000`.

---

### `getCheapestPOS(flight): POSOption`

```typescript
export function getCheapestPOS(flight: Flight): POSOption {
  return [...flight.posOptions].sort((a, b) => a.price - b.price)[0]
}
```

Returns the `POSOption` with the lowest price. Used everywhere a "cheapest" reference is needed.

---

### `getIndianPrice(flight): number`

```typescript
export function getIndianPrice(flight: Flight): number {
  const indian = flight.posOptions.find(p => p.countryCode === "IN")
  return indian?.price ?? getCheapestPOS(flight).price
}
```

Returns the Indian POS price, falling back to cheapest if no Indian option exists.

---

### `mockFlights` Array

7 hardcoded `Flight` objects for the DEL→BLR route (March 17, 2026). Only used if `NEXT_PUBLIC_USE_MOCK_DATA=true` in `.env.local`. With real API mode, the results page ignores this array.

| ID | Airline | Route | Stops | POS Count |
|----|---------|-------|-------|-----------|
| fl-001 | Air India Express | DEL→BLR | 0 | 8 |
| fl-002 | Air India Express | DEL→BLR | 0 | 6 |
| fl-003 | IndiGo | DEL→GOI→BLR | 1 | 6 |
| fl-004 | Akasa Air | DEL→BLR | 0 | 6 |
| fl-005 | Air India | DEL→BLR | 0 | 6 |
| fl-006 | SpiceJet | DEL→BOM→BLR | 1 | 6 |
| fl-007 | Vistara | DEL→BLR | 0 | 6 |

---

## `lib/exchangeRate.ts` — Server-Side FX Service

**Server-only module.** Not imported by any client component. Used only in API routes (`/api/geoarb/search/route.ts`).

### Purpose
Fetches live currency exchange rates from the Frankfurter API with caching, deduplication, and fallback.

### Exports

#### `getRates(base: string): Promise<Record<string, number>>`

```typescript
async function getRates(base: string): Promise<Record<string, number>>
```

Fetches from `https://api.frankfurter.app/latest?base={base}` with:
- **1-hour in-memory cache** (Map keyed by base currency + hour bucket)
- **Request deduplication**: at most 1 in-flight HTTP request per base currency
- **5-second timeout** via `AbortController`
- **Fallback to `FALLBACK_USD_RATES`** on any network failure, scaled to the requested base

#### `convert(amount, from, to, bankFeePercent?): Promise<ConversionResult>`

```typescript
async function convert(
  amount:          number,
  from:            string,
  to:              string,
  bankFeePercent?: number   // default 3
): Promise<{
  converted:     number
  bankFee:       number
  totalWithFee:  number
  rate:          number
}>
```

Full conversion with optional bank fee (the "safety buffer" for booking in foreign currencies).

#### `getRecentDevaluations(): string[]`

Returns `["TR", "EG", "AR"]` — a hardcoded watchlist of countries with currency devaluation risk. Used by the GeoArb engine to add devaluation-wildcard POS options.

#### `currencyForCountry(countryCode: string): string`

Maps ~40 ISO country codes to their currency codes. Covers all 190 POS countries supported by the DataCrawler API.

### Fallback Rates

`FALLBACK_USD_RATES` contains approximate exchange rates (Feb 2026) for 50+ currencies, used when the Frankfurter API is unavailable.

---

## `lib/apiConstants.ts` — Validation Sets

Used by API route handlers to validate input country codes and currency codes before forwarding to the external DataCrawler API.

### Exports

```typescript
export const SUPPORTED_COUNTRIES: Set<string>
// ~190 ISO 3166-1 alpha-2 codes: "IN", "US", "TR", "AE", ...

export const SUPPORTED_CURRENCIES: Set<string>
// ~160+ ISO 4217 codes: "INR", "USD", "EUR", "TRY", ...

export function isValidCountry(code: string): boolean
export function isValidCurrency(code: string): boolean
```

**Frontend usage:** These are not directly imported by any client component. They're used server-side to return `400 Bad Request` for invalid inputs.

---

## `lib/supabaseClient.ts` — Client-Side Supabase

### Exports

```typescript
export function getSupabase(): SupabaseClient
export const supabase: SupabaseClient
```

### Singleton Pattern

```typescript
let instance: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (instance) return instance

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) throw new Error("Missing Supabase env vars")

  instance = createClient(url, key)
  return instance
}

export const supabase = getSupabase()
```

### Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe for browser) |

Both must be prefixed with `NEXT_PUBLIC_` to be available in the browser.

### Usage in Frontend

```typescript
// In useAuth.tsx:
import { supabase } from "@/lib/supabaseClient"

supabase.auth.getSession()
supabase.auth.onAuthStateChange(...)
supabase.auth.signInWithOAuth({ provider: "google" })
supabase.auth.signOut()
supabase.from("profiles").select(...)
supabase.from("profiles").update(...)
```

---

## `lib/utils.ts` — Class Utility

### Exports

```typescript
export function cn(...inputs: ClassValue[]): string
```

Standard shadcn/ui utility. Combines `clsx` (conditional class logic) with `tailwind-merge` (deduplication of conflicting Tailwind classes).

### Usage

```typescript
// Conditional classes
<div className={cn("base-class", isActive && "active-class", variant === "danger" && "text-red-400")}>

// Merge conflicting classes (last wins)
cn("px-4 px-2")  // → "px-2"
```

Used throughout shadcn components and anywhere dynamic class composition is needed.
