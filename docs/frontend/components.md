# Components

All OmniFare-specific components live in `components/omni/`. UI primitives from shadcn/ui live in `components/ui/` and are not documented individually here (they follow standard shadcn patterns).

---

## `HeroSection.tsx`

### Purpose
Purely decorative animated banner displayed at the top of the home page. Contains mountain silhouettes, tree clusters, and an animated airplane that flies left to right.

### Signature
```typescript
export function HeroSection(): JSX.Element
// No props
```

### Key Visual Elements

**Background**
```
height: 280px
background: gradient(navy-800 → navy-900 → navy-950)
```

**Mountain landscape**
- SVG `<path>` elements forming two mountain silhouettes (inline, no external file)
- `<Mountain>` Lucide icons placed as large background shapes with low opacity

**Tree clusters**
- Left cluster (~10% from left): 5 `<TreePine>` Lucide icons at varying heights
- Right cluster (~10% from right): 5 `<TreePine>` Lucide icons
- Heights are hardcoded arrays: `const leftTreeHeights = [40, 55, 70, 55, 40]`

**Animated airplane**
```typescript
// Framer Motion animation
<motion.div
  animate={{ left: ["-5%", "105%"] }}
  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
>
  {/* Custom SVG airplane pointing rightwards */}
</motion.div>
```

**Centered text**
```
"Flights" — 5xl, font-light, text-white
Subtitle: "Comparing prices across 190+ countries"
```

### Dependencies
- Framer Motion (`motion.div`)
- Lucide React (`Mountain`, `TreePine`)

### Notes
- No state, no props, no API calls
- Hydration-safe: the random height arrays are hardcoded constants, not computed at render time (fixes React hydration mismatch)

---

## `Navbar.tsx`

### Purpose
Sticky top navigation bar. Shows branding, country/currency selectors, and auth controls (sign in / user avatar + logout).

### Signature
```typescript
export function Navbar(): JSX.Element
// No props
```

### Consumed Contexts
- `useAuth()` → `isLoggedIn`, `user`, `logout`, `setShowAuthModal`
- `useAppState()` → `homeCountry`, `setHomeCountry`, `preferredCurrency`, `setPreferredCurrency`
- `useRouter()` → `router.push("/")`

### Local State
```typescript
const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
```

### Layout Structure
```
[Logo]          [← Country Select →] [← Currency Select →]   [Avatar | Sign In]
```
Country/Currency selectors are hidden on mobile (`sm:hidden`).

### Logo
```jsx
<div className="bg-electric/10 rounded-lg p-1.5">
  <PlaneTakeoff className="text-electric w-5 h-5" />
</div>
<span>Omni<strong>Fare</strong></span>
```
Click navigates to `/`.

### Country Selector
```typescript
// Renders Select from countries[] array in mockFlights.ts
// On change: sets BOTH homeCountry AND preferredCurrency to match
onChange = (code: string) => {
  setHomeCountry(code)
  const country = countries.find(c => c.code === code)
  if (country) setPreferredCurrency(country.currency)
}
```

### Currency Selector
```typescript
// Renders Select from all unique currencies across countries[]
// Independent of country selector — user can mix country and currency
onChange = (currency: string) => setPreferredCurrency(currency)
```

### Auth Controls

**Logged in:**
```jsx
<div className="avatar-circle">{user.initials}</div>
<Button onClick={() => setShowLogoutConfirm(true)}>
  <LogOut />
</Button>
```

**Logged out:**
```jsx
<Button onClick={() => setShowAuthModal(true)}>Sign In</Button>
```

### Logout Confirmation
Uses shadcn `AlertDialog`:
```
"Sign out of OmniFare?"
[Cancel] [Sign Out]
```
Sign Out calls `logout()` (Supabase signOut) then `router.push("/")`.

---

## `SearchBar.tsx`

### Purpose
The main flight search form. Renders as either a floating card over the hero (home page) or an inline bar (results page via `compact` prop).

### Signature
```typescript
export function SearchBar({ compact?: boolean }): JSX.Element
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `compact` | `boolean` | `false` | Removes negative margin/z-index, renders inline |

### Consumed Contexts
- `useAppState()` — reads and writes all form fields
- `useAuth()` → `isLoggedIn`, `setShowAuthModal`

### Local State
```typescript
const [originOpen, setOriginOpen]       = useState(false)   // Origin popover
const [destOpen, setDestOpen]           = useState(false)   // Destination popover
const [validationError, setError]       = useState("")
const [calendarPrices, setCalPrices]    = useState<Record<string, number>>({})
const [loadingPrices, setLoadingPrices] = useState(false)
```

Also uses `useRef<AbortController>` for the calendar prices fetch.

### Calendar Price Fetch (useEffect)

Triggers when `origin` OR `destination` changes:

```typescript
useEffect(() => {
  // Clear prices if either field is empty
  if (!origin || !destination) { setCalendarPrices({}); return }

  // Abort previous request
  calendarFetchRef.current?.abort()
  const controller = new AbortController()
  calendarFetchRef.current = controller

  setLoadingPrices(true)
  fetch("/api/geoarb/calendar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({ origin, destination }),
  })
  .then(r => r.json())
  .then(data => {
    // Normalize: handles both { prices: Record } and { days: Array } shapes
    if (data.prices) {
      setCalendarPrices(data.prices)
    } else if (data.days) {
      const normalized: Record<string, number> = {}
      data.days.forEach((d: any) => {
        normalized[d.date] = d.price ?? d.cheapest_price
      })
      setCalendarPrices(normalized)
    }
  })
  .finally(() => setLoadingPrices(false))
}, [origin, destination])
```

### `handleSearch()`
```typescript
function handleSearch() {
  // 1. Validate
  if (!origin)      { setValidationError("Please select a departure airport"); return }
  if (!destination) { setValidationError("Please select a destination"); return }

  // 2. Auth gate
  if (!isLoggedIn) { setShowAuthModal(true); return }

  // 3. Navigate
  const d = departureDate ?? new Date()
  const dateStr = format(d, "yyyy-MM-dd")  // date-fns
  router.push(`/results?from=${origin}&to=${destination}&date=${dateStr}`)
}
```

### `swapAirports()`
```typescript
function swapAirports() {
  const tmp = origin
  setOrigin(destination)
  setDestination(tmp)
}
```

### Form Controls

| Control | Type | Options |
|---------|------|---------|
| Trip Type | `Select` | One Way, Round Trip, Multi-City |
| Passengers | `Popover` | +/- buttons, 1–9 |
| Cabin Class | `Select` | Economy, Premium Economy, Business, First |
| Origin | `Popover` | Full `airports[]` list |
| Destination | `Popover` | `airports[]` excluding current origin |
| Departure Date | `Popover` → `PriceCalendar` | With live price heatmap |
| Return Date | `Popover` → `PriceCalendar` | Only when tripType==="round-trip" |

### Validation Error Animation
```jsx
<AnimatePresence>
  {validationError && (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <AlertCircle /> {validationError}
    </motion.div>
  )}
</AnimatePresence>
```

### API Calls
- `POST /api/geoarb/calendar` — calendar price heatmap data

---

## `PriceCalendar.tsx`

### Purpose
Custom date picker calendar that displays a price heatmap: each day shows a color-coded price label below the date number.

### Signature
```typescript
export function PriceCalendar({
  selected:       Date | undefined,
  onSelect:       (d: Date | undefined) => void,
  showPrices:     boolean,              // If true, show price labels
  livePrices?:    Record<string, number>,  // Keyed "yyyy-MM-dd"
  loadingPrices?: boolean,
}): JSX.Element
```

### Local State
```typescript
const [currentMonth, setCurrentMonth] = useState<Date>(selected ?? new Date())
```

### Price Color Logic
```typescript
function getPriceColor(price: number): string {
  if (price < 4800) return "text-success"       // green — cheap
  if (price < 5800) return "text-electric-light" // blue — medium
  return "text-red-400"                          // red — expensive
}
```

**Note:** Thresholds are hardcoded in INR and calibrated for typical DEL→BLR prices. Not suitable for international routes without updates.

### Price Display Format
```
₹{(price / 1000).toFixed(1)}k
// e.g. ₹4.9k
```
Only shown when `showPrices && !isPast`.

### Calendar Grid Construction
```typescript
const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
const startOffset = getDay(days[0])  // 0=Sun, shift cells to align day of week
```

Empty cells are rendered for offset days at the start of the month.

### Day Cell States
| State | Style |
|-------|-------|
| Past date | `opacity-30 cursor-not-allowed` |
| Today | `font-bold text-electric` |
| Selected | `bg-electric text-white rounded-full` |
| Has price | Shows colored price label below number |
| Loading price | Shows "…" placeholder |

### Legend
```jsx
<div className="flex gap-4 mt-3">
  <span className="text-success">● Low</span>
  <span className="text-electric-light">● Medium</span>
  <span className="text-red-400">● High</span>
</div>
```

### Navigation
```jsx
<button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>←</button>
<span>{format(currentMonth, "MMMM yyyy")}</span>
<button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>→</button>
```

---

## `FlightCard.tsx`

### Purpose
Single collapsible flight result card. Shows a summary row when collapsed. Expands to show per-leg details, baggage info, full POS breakdown table, and the "Book Now" button.

### Signature
```typescript
export function FlightCard({ flight: Flight }): JSX.Element
```

### Consumed Contexts
- `useAppState()` → `preferredCurrency`, `noFxFeeCard`, `homeCountry`
- `useRouter()` → for booking navigation

### Local State
```typescript
const [expanded, setExpanded] = useState(false)
```

### Internal Sub-component: `AirlineLogo`
```typescript
function AirlineLogo({ airline: string, airlineLogo: string }): JSX.Element
```

Tries to render `<img src={airlineLogo}>`. On error, falls back to a colored initials badge.

**Hardcoded airline colors:**
```typescript
const airlineColors: Record<string, string> = {
  "Air India Express": "bg-orange-600",
  "IndiGo":           "bg-blue-600",
  "Akasa Air":        "bg-orange-500",
  "SpiceJet":         "bg-yellow-600",
  "Vistara":          "bg-purple-700",
}
// default: bg-navy-700
```

### Internal Sub-component: `SmallRiskBadge`
```typescript
function SmallRiskBadge({ level: "low" | "medium" }): JSX.Element
```

| Level | Icon | Text | Color |
|-------|------|------|-------|
| `"low"` | Shield | Low Risk | text-success (green) |
| `"medium"` | Shield | Medium | text-warning (amber) |

### Pricing Logic

```typescript
const cheapest     = getCheapestPOS(flight)
const indianOption = flight.posOptions.find(p => p.countryCode === "IN")
const displayPOS   = (indianOption && indianOption.price > 0) ? indianOption : cheapest

const displayPrice   = displayPOS.price
const convertedPrice = convertCurrency(displayPrice, preferredCurrency)
const fxFee          = Math.round(convertedPrice * 0.03)

// FX fee is shown ONLY when:
// 1. User hasn't checked "I have a No FX fee card"
// 2. The displayed price is NOT from the user's home country
const showFxFee = !noFxFeeCard && displayPOS.countryCode !== homeCountry
```

**Why show Indian price if available?** Indian users primarily care about the Indian price. The GeoArb opportunity is shown separately via the POS breakdown. If no Indian POS option exists (e.g., route not sold in India), falls back to the cheapest globally.

### Collapsed Summary Row (always visible)

```
[AirlineLogo] [Airline Name]  [8:34 AM → 11:29 AM]  [2h 55m · DEL→BLR]  [Direct]  [CO₂]  [Price + FX fee]
[Best Price: 🇹🇷 Turkey] [SmallRiskBadge]  [🇹🇷 🇮🇳 🇺🇸 🇬🇧 🇸🇬 🇧🇷]  [▼]
```

The 6 flag emojis at the bottom are the 6 cheapest POS options, each with a `title` tooltip showing the price in the preferred currency.

### Expanded Detail Section (AnimatePresence)

**Flight date header**
```
Tue, Mar 17  ·  🌱 154 kg CO₂ estimated
```

**Per-leg breakdown** (one card per leg in `flight.legs`):
```
[Depart: 8:34 AM | Indira Gandhi International (DEL)]
[   2 hr 55 min — Air India Express IX 2679 — Airbus A320   ]
[Arrive: 11:29 AM | Kempegowda International (BLR)]
```

**Baggage row:**
```
Carry-on: ✓ included   Checked bag: ✓ 15kg included
// or:
Checked bag: ✗ Not included (Luggage icon)
```

**POS breakdown table:**
Sorted cheapest first. Columns: Flag, Country, Code, Risk badge, Converted price (+ FX fee if applicable), "↓ cheapest" label on first row.

**"Book Now" button:**
```typescript
<Button onClick={() => router.push(`/booking?id=${flight.id}`)}>
  Book Now
</Button>
```

---

## `ResultsFilter.tsx`

### Purpose
Controlled filter/sort UI for the results page. Three `Select` dropdowns.

### Signature
```typescript
export function ResultsFilter({
  stopsFilter:    string,
  setStopsFilter: (v: string) => void,
  sortBy:         string,
  setSortBy:      (v: string) => void,
  airlineFilter:  string,
  setAirlineFilter: (v: string) => void,
  airlines:       string[],
  timeFilter:     string,
  setTimeFilter:  (v: string) => void,
}): JSX.Element
```

### No internal state — fully controlled.

### Rendered Controls

**Stops Select:**
| Value | Label |
|-------|-------|
| `"any"` | Any Stops |
| `"0"` | Direct |
| `"1"` | 1 Stop |
| `"2+"` | 2+ Stops |

**Airlines Select:**
| Value | Label |
|-------|-------|
| `"all"` | All Airlines |
| `airline` | Airline name (dynamic from `airlines[]` prop) |

**Time Select:**
| Value | Label |
|-------|-------|
| `"any"` | Any time |
| `"morning"` | Morning (6am–12pm) |
| `"afternoon"` | Afternoon (12–6pm) |
| `"evening"` | Evening (6pm–12am) |

---

## `BookingProviders.tsx`

### Purpose
The booking page's core component. Takes POS options from a flight, fetches live OTA provider names via the API, and presents a list of bookable providers. Handles VPN recommendations and usage metering.

### Exported Interfaces
```typescript
export interface POSOptionBrief {
  countryCode:  string
  countryName:  string
  flagEmoji:    string
  price:        number
  riskLevel:    "low" | "medium"
  bookingToken?: string
}

export function BookingProviders({ posOptions: POSOptionBrief[] }): JSX.Element
```

### Internal Interfaces
```typescript
interface LiveBookingOption {
  id:             string    // Unique composite ID
  title:          string    // OTA name: "MakeMyTrip", "Cleartrip"
  website:        string    // Domain: "makemytrip.com"
  price:          number    // Price in INR
  isAirline:      boolean   // true if it's a direct airline booking
  token:          string    // booking_token for the booking API
  posCountryCode: string
  posCountryName: string
  posFlagEmoji:   string
  posRiskLevel:   "low" | "medium"
}

interface VPNDialogState {
  open:        boolean
  option:      LiveBookingOption | null
}
```

### Constant: `MEDIUM_RISK` Countries
```typescript
const MEDIUM_RISK = new Set([
  "AR", "EG", "VN", "NG", "PK", "BD", "TR",
  "BO", "KE", "GH", "TZ", "UG", "ZM", "ZW",
  "BI", "CM", "TD", "CF"
])
```
Used to dynamically determine risk level when API doesn't specify it.

### State
```typescript
const [providers, setProviders]     = useState<LiveBookingOption[]>([])
const [loading, setLoading]         = useState(true)
const [fetchError, setFetchError]   = useState<string | null>(null)
const [loadingToken, setLoadingToken] = useState<string | null>(null)  // First 20 chars
const [bookingError, setBookingError] = useState<string | null>(null)
const [vpnDialog, setVpnDialog]     = useState<VPNDialogState>({ open: false, option: null })
```

### useEffect — Fetch Provider Names

```typescript
useEffect(() => {
  if (!posOptions.length) { setLoading(false); return }

  // Take up to 3 cheapest options that have a bookingToken
  const top3 = [...posOptions]
    .filter(p => p.bookingToken)
    .sort((a, b) => a.price - b.price)
    .slice(0, 3)

  fetch("/api/geoarb/booking-options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: top3.map(p => ({
        booking_token: p.bookingToken,
        country_code:  p.countryCode,
        currency:      "INR",
      }))
    })
  })
  .then(r => r.json())
  .then(data => {
    // data.results is array of booking-details responses
    // Deduplicate by provider title, keep cheapest price per title
    const byTitle = new Map<string, LiveBookingOption>()
    data.results.forEach((result: any) => {
      result.options?.forEach((opt: any) => {
        const existing = byTitle.get(opt.title)
        if (!existing || opt.price < existing.price) {
          byTitle.set(opt.title, {
            id:             `${result.posCountryCode}-${opt.title}`,
            title:          opt.title,
            website:        opt.website ?? "",
            price:          opt.price,
            isAirline:      opt.is_airline ?? false,
            token:          opt.token,
            posCountryCode: result.posCountryCode,
            posCountryName: result.posCountryName,
            posFlagEmoji:   result.posFlagEmoji,
            posRiskLevel:   MEDIUM_RISK.has(result.posCountryCode) ? "medium" : "low",
          })
        }
      })
    })
    setProviders(Array.from(byTitle.values()).sort((a, b) => a.price - b.price))
  })
  .catch(err => setFetchError(err.message))
  .finally(() => setLoading(false))
}, [posOptions])
```

### `doBooking(option)`

```typescript
async function doBooking(option: LiveBookingOption) {
  // 1. Open blank tab synchronously (avoids popup blocker)
  const newTab = window.open("about:blank", "_blank")
  if (newTab) {
    newTab.document.write(`
      <html><body style="background:#060e1f;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">
        <div>✈️ OmniFare — Fetching your booking link…</div>
      </body></html>
    `)
  }

  setLoadingToken(option.token.slice(0, 20))

  const res = await fetch("/api/geoarb/booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token:        option.token,
      currency:     "INR",
      country_code: option.posCountryCode,
    })
  })
  const data = await res.json()

  if (!data.booking_url) {
    newTab?.close()
    setBookingError("Could not retrieve booking URL. Please try a different provider.")
    setLoadingToken(null)
    return
  }

  if (newTab) newTab.location.href = data.booking_url
  setLoadingToken(null)
}
```

**Key pattern:** `window.open()` called synchronously in the user-initiated click handler. All async work updates the already-opened tab's URL. This bypasses browser popup blockers which block `window.open()` inside async callbacks.

### `handleContinue(option)`

```typescript
async function handleContinue(option: LiveBookingOption) {
  // 1. Usage gate
  const allowed = await incrementUsage()
  if (!allowed) return  // shows UsageLimitModal internally

  // 2. VPN recommendation for foreign POS
  if (option.posCountryCode !== homeCountry) {
    setVpnDialog({ open: true, option })
    return
  }

  // 3. Proceed directly for home country POS
  await doBooking(option)
}
```

### VPN Dialog
```jsx
<Dialog open={vpnDialog.open} onOpenChange={...}>
  <Globe className="text-electric" />
  <h2>VPN Recommended</h2>
  <p>
    You're booking from {vpnDialog.option?.posCountryName}.
    For best results, use a VPN set to {vpnDialog.option?.posCountryName}.
  </p>
  <Button onClick={() => doBooking(vpnDialog.option)}>Continue to Booking</Button>
  <Button variant="ghost" onClick={() => setVpnDialog({ open: false, option: null })}>Cancel</Button>
</Dialog>
```

### Rendered Provider Row
```jsx
{providers.map(option => (
  <div key={option.id}>
    <ProviderIcon title={option.title} website={option.website} />
    <div>
      <span>{option.title}</span>
      {option.isAirline && <Badge>Airline</Badge>}
      {idx === 0 && <Badge>Best Price</Badge>}
      <SmallRiskBadge level={option.posRiskLevel} />
    </div>
    <div>
      {option.posCountryCode !== homeCountry && (
        <span>🌐 VPN recommended</span>
      )}
      <span>{option.posFlagEmoji} {option.posCountryName}</span>
    </div>
    <div>
      <span>{formatPrice(convertedPrice, preferredCurrency)}</span>
      {showFxFee && <span>+{formatPrice(fxFee)} est. FX fee</span>}
    </div>
    <Button
      onClick={() => handleContinue(option)}
      disabled={loadingToken !== null}
      variant={option.posRiskLevel === "medium" ? "warning" : "default"}
    >
      {loadingToken?.startsWith(option.token.slice(0, 20)) ? "Loading…" : "Continue"}
    </Button>
  </div>
))}
```

### Internal Sub-component: `ProviderIcon`
```typescript
function ProviderIcon({ title: string, website: string }): JSX.Element
```
Attempts Google favicon URL: `https://www.google.com/s2/favicons?domain={website}&sz=32`

Falls back to 2-letter initials badge on error. Initials color is deterministic based on title string hash.

### API Calls
| Endpoint | Method | When |
|----------|--------|------|
| `/api/geoarb/booking-options` | POST | On mount, fetches provider names for top 3 POS tokens |
| `/api/geoarb/booking` | POST | When user clicks Continue |

---

## `POSTable.tsx`

### Purpose
The legacy booking options component. Designed to work from within the `FlightCard` expanded view context. **Not currently used on the booking page** (which uses `BookingProviders` instead). Kept for potential future use or re-integration.

### Signature
```typescript
export function POSTable({
  flight:      Flight,
  dataSource?: "live" | "mock" | null
}): JSX.Element
```

### Key Differences from `BookingProviders`
| Feature | POSTable | BookingProviders |
|---------|----------|-----------------|
| Input | Full `Flight` object | `POSOptionBrief[]` |
| Provider names | Uses whatever is in `flight.posOptions` | Fetches live from booking-options API |
| POS count | Shows all POS options | Shows only top 3 fetched |
| Placement | Inside FlightCard expand | Standalone page component |
| Status | Legacy / not in use on booking page | Active |

### State
```typescript
const [displayOptions, setDisplayOptions] = useState<POSOption[]>(flight.posOptions)
const [loadingPOS, setLoadingPOS]         = useState<string | null>(null)
const [bookingError, setBookingError]     = useState<string | null>(null)
const [vpnDialog, setVpnDialog]           = useState<VPNDialogState>(...)
const [posIcons, setPosIcons]             = useState<Record<string, string>>({})
```

### `doBooking(pos)`
Same popup-blocker-safe pattern as `BookingProviders.doBooking()`. Calls `POST /api/geoarb/booking`. On success, if `dataSource === "live"`, updates `displayOptions` with the real provider name returned by the API.

---

## `BudgetTracker.tsx`

### Purpose
Fixed bottom-right widget showing the user's API usage as a circular SVG progress ring. Only visible when logged in.

### Signature
```typescript
export function BudgetTracker(): JSX.Element
// No props
```

### Consumed Context
- `useAuth()` → `isLoggedIn`, `apiCallsMade`, `maxApiLimit`, `isUnlimited`

### Local State
```typescript
const [showTooltip, setShowTooltip] = useState(false)
```
Controlled by mouse enter/leave events on the widget.

### Progress Ring Math
```typescript
const used = Math.min(100, Math.round((apiCallsMade / maxApiLimit) * 100))

// SVG circle: r=15.5, approximate circumference ≈ 97.4
// Using strokeDasharray trick: "used 100-used" (percentages used directly)
```

### Color States
```typescript
const strokeColor =
  used >= 90 ? "#ef4444" :  // danger — red
  used >= 70 ? "#f59e0b" :  // warning — amber
               "#3b82f6"    // normal — blue
```

### Unlimited Mode
For users with `isUnlimited === true` (email in `UNLIMITED_EMAILS`), shows `<Infinity>` Lucide icon instead of the ring.

### Tooltip Content
```
"This is a passion project built using free-tier APIs with limited resources.
Usage resets monthly."
```

---

## `AuthModal.tsx`

### Purpose
Google OAuth sign-in dialog. Globally rendered in `Providers`, controlled via auth context.

### Signature
```typescript
export function AuthModal(): JSX.Element
// No props — reads everything from useAuth()
```

### Consumed Context
- `useAuth()` → `showAuthModal`, `setShowAuthModal`, `login`

### Content
```jsx
<Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
  <Plane icon />
  <h2>Welcome to OmniFare</h2>
  <p>Sign in to search flights across 190+ global Points of Sale</p>
  <Button onClick={login} className="bg-white text-gray-900">
    <GoogleSVG />
    Continue with Google
  </Button>
  <p className="text-xs">By continuing, you agree to our Terms of Service</p>
</Dialog>
```

`login()` calls `supabase.auth.signInWithOAuth({ provider: "google" })` which triggers a full-page redirect to Google OAuth, then back to `/auth/callback`.

---

## `UsageLimitModal.tsx`

### Purpose
Dialog shown when the user exhausts their API call quota.

### Signature
```typescript
export function UsageLimitModal(): JSX.Element
// No props — reads everything from useAuth()
```

### Consumed Context
- `useAuth()` → `showUsageLimitModal`, `setShowUsageLimitModal`, `apiCallsMade`, `maxApiLimit`

### Content
```jsx
<Dialog open={showUsageLimitModal} onOpenChange={setShowUsageLimitModal}>
  <AlertTriangle icon className="text-warning" />
  <h2>Usage Limit Reached</h2>
  <p>You've used {apiCallsMade} of {maxApiLimit} API calls this month.</p>
  <Button onClick={() => window.location.href = "mailto:rraj.official5@gmail.com?subject=OmniFare%20Usage%20Limit"}>
    Request More Access
  </Button>
  <Button variant="ghost" onClick={() => setShowUsageLimitModal(false)}>Close</Button>
</Dialog>
```

---

## `ProviderIcon.tsx`

### Purpose
Standalone component for rendering provider logos using Next.js `<Image>`. Used for cases when a direct logo URL is available.

### Signature
```typescript
export function ProviderIcon({
  providerLogo?: string,
  provider:      string,
  size?:         "sm" | "md"
}): JSX.Element
```

| Size | Container | Image |
|------|-----------|-------|
| `"md"` (default) | 40×40px | 24px |
| `"sm"` | 32×32px | 20px |

### Fallback Behavior
1. If `providerLogo` URL provided: renders `<Image>` with `onError` that hides the image and shows initials
2. If no URL: renders 2-letter initials badge
3. If no initials possible: renders `<Store>` Lucide icon

**Note:** In practice, `BookingProviders` and `POSTable` use their own inline `ProviderIcon` component (Google favicon service) rather than this standalone file.

---

## shadcn/ui Components (`components/ui/`)

These are standard shadcn/ui components generated by the CLI. They use Radix UI primitives and are styled to the navy/electric dark theme. Key customizations are in `globals.css` via CSS variables.

| Component | Used By |
|-----------|---------|
| `Alert Dialog` | `Navbar` (logout confirm) |
| `Badge` | `FlightCard`, `POSTable`, `BookingProviders` |
| `Button` | Everywhere |
| `Calendar` | Not used (custom `PriceCalendar` used instead) |
| `Dialog` | `POSTable`, `BookingProviders`, `AuthModal`, `UsageLimitModal` |
| `Input` | Not used directly |
| `Label` | Minor form elements |
| `Popover` | `SearchBar` (airport picker, date picker) |
| `Select` | `SearchBar`, `ResultsFilter`, `Navbar` |
| `Separator` | `FlightCard`, `POSTable`, `BookingProviders` |
| `Sheet` | Defined but not actively used |
| `Tooltip` | `POSTable` (risk note tooltips); `TooltipProvider` in `Providers` |
