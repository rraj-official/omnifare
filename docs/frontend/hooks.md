# Hooks

OmniFare has two custom React Contexts, both implemented as hooks in the `hooks/` directory.

---

## `useAppState` — `hooks/useAppState.tsx`

### Purpose
Central store for all flight search form state and user display preferences. Shared across `SearchBar`, `ResultsContent`, `FlightCard`, `BookingProviders`, `Navbar`, and any component that needs user preferences.

### Exports
```typescript
export function AppStateProvider({ children: ReactNode }): JSX.Element
export function useAppState(): AppState
```

`useAppState()` throws with `"useAppState must be used within AppStateProvider"` if called outside `AppStateProvider`.

### `AppState` Interface (Full)

```typescript
interface AppState {
  // User identity/preference
  homeCountry:         string               // ISO 2-letter: "IN"
  setHomeCountry:      (v: string) => void

  preferredCurrency:   string               // ISO 3-letter: "INR"
  setPreferredCurrency: (v: string) => void

  // Search form fields
  origin:              string               // IATA code: "DEL"
  setOrigin:           (v: string) => void

  destination:         string               // IATA code: "" (empty until selected)
  setDestination:      (v: string) => void

  departureDate:       Date | undefined
  setDepartureDate:    (d: Date | undefined) => void

  returnDate:          Date | undefined
  setReturnDate:       (d: Date | undefined) => void

  passengers:          number               // 1–9
  setPassengers:       (n: number) => void

  cabinClass:          string               // "economy"|"premium"|"business"|"first"
  setCabinClass:       (v: string) => void

  tripType:            string               // "one-way"|"round-trip"|"multi-city"
  setTripType:         (v: string) => void

  // Pricing display options
  noFxFeeCard:         boolean              // If true, suppress FX fee display
  setNoFxFeeCard:      (v: boolean) => void
}
```

### Default Values
```typescript
homeCountry:       "IN"
preferredCurrency: "INR"
origin:            "DEL"
destination:       ""
departureDate:     new Date(2026, 2, 17)   // March 17, 2026
returnDate:        new Date(2026, 2, 21)   // March 21, 2026
passengers:        1
cabinClass:        "economy"
tripType:          "one-way"
noFxFeeCard:       false
```

### Key Behaviors

**No persistence:** All state lives in-memory. If the user refreshes the page, form state resets to defaults. This is intentional — the search is driven by URL params (`?from=&to=&date=`), so refreshing the results page works correctly.

**No API calls.** Pure React state.

**`homeCountry` drives FX fee display:** `FlightCard` and `BookingProviders` check `displayPOS.countryCode !== homeCountry` to decide whether to show the "+X est. FX fee (3%)" line. If the booking POS is the user's home country, there's no foreign exchange fee.

**`noFxFeeCard` overrides everything:** When `true`, the FX fee line is hidden everywhere, regardless of POS country.

### Usage Patterns

**Reading preferences (FlightCard, BookingProviders):**
```typescript
const { preferredCurrency, noFxFeeCard, homeCountry } = useAppState()
```

**Updating search form (SearchBar):**
```typescript
const {
  origin, setOrigin,
  destination, setDestination,
  departureDate, setDepartureDate,
  passengers, setPassengers,
  cabinClass, setCabinClass,
  tripType, setTripType,
} = useAppState()
```

**Country selector sync (Navbar):**
```typescript
const { homeCountry, setHomeCountry, setPreferredCurrency } = useAppState()

// When country changes, auto-update currency
function onCountryChange(code: string) {
  setHomeCountry(code)
  const country = countries.find(c => c.code === code)
  if (country) setPreferredCurrency(country.currency)
}
```

---

## `useAuth` — `hooks/useAuth.tsx`

### Purpose
Supabase-backed authentication context. Manages Google OAuth login/logout, session persistence across page reloads, Supabase profile data (usage counters), and usage limit enforcement.

### Exports
```typescript
export function AuthProvider({ children: ReactNode }): JSX.Element
export function useAuth(): AuthState
```

`useAuth()` throws with `"useAuth must be used within AuthProvider"` if called outside.

### `AuthState` Interface (Full)

```typescript
interface AuthState {
  // Auth state
  isLoggedIn:    boolean
  user:          UserInfo | null
  login:         () => void
  logout:        () => void
  loading:       boolean   // true until initial session check completes

  // Modal controls (globally rendered in Providers)
  showAuthModal:       boolean
  setShowAuthModal:    (v: boolean) => void
  showUsageLimitModal: boolean
  setShowUsageLimitModal: (v: boolean) => void

  // Usage metering
  apiCallsMade:  number
  maxApiLimit:   number
  isUnlimited:   boolean
  incrementUsage: () => Promise<boolean>
}

interface UserInfo {
  name:   string   // Full name or email prefix
  email:  string
  avatar: string   // 1–2 letter initials
}
```

### State Variables (Internal)

```typescript
const [session, setSession]                           = useState<Session | null>(null)
const [loading, setLoading]                           = useState(true)
const [showAuthModal, setShowAuthModal]               = useState(false)
const [showUsageLimitModal, setShowUsageLimitModal]   = useState(false)
const [apiCallsMade, setApiCallsMade]                 = useState(0)
const [maxApiLimit, setMaxApiLimit]                   = useState(1000)
```

### Constants
```typescript
const UNLIMITED_EMAILS = ["rraj.official5@gmail.com"]
```
Users with these emails bypass all quota checks. `isUnlimited` is `true` when `session?.user.email` is in this set.

### useEffect 1 — Session Initialization

Runs once on mount:

```typescript
useEffect(() => {
  // Load existing session from Supabase (persisted in localStorage by Supabase)
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
    setLoading(false)
  })

  // Subscribe to future auth changes (login, logout, token refresh)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    setSession(session)
    if (event === "SIGNED_IN") setShowAuthModal(false)  // Close modal on successful login
  })

  return () => subscription.unsubscribe()
}, [])
```

### useEffect 2 — Profile Fetch

Runs whenever `supabaseUser` changes (derived from `session?.user`):

```typescript
useEffect(() => {
  if (!supabaseUser) return

  supabase
    .from("profiles")
    .select("api_calls_made, max_api_limit")
    .eq("id", supabaseUser.id)
    .single()
    .then(({ data }) => {
      if (data) {
        setApiCallsMade(data.api_calls_made ?? 0)
        setMaxApiLimit(data.max_api_limit ?? 1000)
      }
    })
}, [supabaseUser])
```

The `profiles` table is created as part of Phase 1 database setup and has a trigger that auto-creates a profile row on new user registration.

### `login()`

```typescript
function login() {
  supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
}
```

Triggers a full-page redirect to Google. After consent, Google redirects back to `/auth/callback` which exchanges the OAuth code for a Supabase session, then redirects to the app.

### `logout()`

```typescript
function logout() {
  supabase.auth.signOut()
  // session will update via onAuthStateChange
}
```

### `incrementUsage(): Promise<boolean>`

Called by `BookingProviders.handleContinue()` before processing a booking.

```typescript
async function incrementUsage(): Promise<boolean> {
  // 1. Must be logged in
  if (!supabaseUser) {
    setShowAuthModal(true)
    return false
  }

  // 2. Unlimited users bypass all checks
  if (isUnlimited) return true

  // 3. Check quota
  if (apiCallsMade >= maxApiLimit) {
    setShowUsageLimitModal(true)
    return false
  }

  // 4. Increment in DB
  const newCount = apiCallsMade + 1
  await supabase
    .from("profiles")
    .update({ api_calls_made: newCount })
    .eq("id", supabaseUser.id)

  setApiCallsMade(newCount)
  return true
}
```

Returns:
- `true` — usage incremented, caller should proceed
- `false` — caller should abort (modal already shown to user)

### Helper Functions (Internal)

```typescript
function avatarFromUser(u: User): string {
  const name = u.user_metadata?.full_name ?? u.email ?? ""
  const parts = name.split(/[\s@.]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return "?"
}

function nameFromUser(u: User): string {
  return u.user_metadata?.full_name ?? u.email ?? "User"
}
```

### Derived Values

```typescript
const supabaseUser = session?.user ?? null
const isLoggedIn   = !!supabaseUser
const isUnlimited  = UNLIMITED_EMAILS.includes(supabaseUser?.email ?? "")

const user: UserInfo | null = supabaseUser ? {
  name:   nameFromUser(supabaseUser),
  email:  supabaseUser.email ?? "",
  avatar: avatarFromUser(supabaseUser),
} : null
```

### Supabase Operations Summary

| Operation | Method | When |
|-----------|--------|------|
| Load session | `auth.getSession()` | App mount |
| Subscribe to changes | `auth.onAuthStateChange()` | App mount |
| Sign in | `auth.signInWithOAuth({ provider: "google" })` | `login()` called |
| Sign out | `auth.signOut()` | `logout()` called |
| Fetch profile | `from("profiles").select(...)` | User session found |
| Update usage | `from("profiles").update(...)` | `incrementUsage()` |

### Usage Flow

```
User is not logged in
  → Clicks "Search" in SearchBar
  → handleSearch() checks isLoggedIn
  → setShowAuthModal(true)
  → AuthModal opens
  → User clicks "Continue with Google"
  → login() → full-page redirect
  → /auth/callback exchanges code
  → onAuthStateChange fires with SIGNED_IN
  → setShowAuthModal(false) (modal closes)
  → setSession(newSession)
  → useEffect 2 fires → fetches profile → sets apiCallsMade

User clicks "Continue" on a booking provider
  → incrementUsage() called
  → if not logged in: setShowAuthModal(true), return false
  → if unlimited: return true
  → if over quota: setShowUsageLimitModal(true), return false
  → DB update, local increment, return true
  → doBooking() proceeds
```
