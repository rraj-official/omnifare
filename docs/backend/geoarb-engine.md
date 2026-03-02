# GeoArb Pricing Engine

The GeoArb (Geographic Arbitrage) engine decides **which 8 Points of Sale (POS) to query** for any given flight search. It is the core backend logic that enables OmniFare to surface the cheapest global booking options.

---

## Purpose

The same flight can be priced differently depending on the country from which it is booked. OTAs (Online Travel Agencies) like Traveloka, Almosafer, and MakeMyTrip serve different markets and often display different prices for the same itinerary. The GeoArb engine selects a small, high-value set of countries to query so we maximize price discovery without exhausting API quota.

---

## Location

`lib/geoArbEngine.ts`

---

## Entry Point

```typescript
export function getPriorityPOS(
  fromCountryCode: string,
  toCountryCode: string
): GeoArbPlan
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `fromCountryCode` | `string` | ISO 3166-1 alpha-2 country code of the **origin airport** (e.g. `"IN"` for Delhi) |
| `toCountryCode` | `string` | ISO 3166-1 alpha-2 country code of the **destination airport** (e.g. `"AE"` for Dubai) |

### Return Type: `GeoArbPlan`

```typescript
interface GeoArbPlan {
  countries: string[];   // Up to 8 country codes
  reasoning: {
    origin: string;
    destination: string;
    baseline: string[];
    structural: string[];
    devaluationWildcards: string[];
  };
}
```

---

## Algorithm (Step-by-Step)

### Step 1: Initialize

```typescript
const from = fromCountryCode.toUpperCase();
const to = toCountryCode.toUpperCase();
const seen = new Set<string>();
const result: string[] = [];

const add = (code: string) => {
  const c = code.toUpperCase();
  if (!seen.has(c) && isValidCountry(c)) {
    seen.add(c);
    result.push(c);
  }
};
```

- `add()` ensures no duplicates and validates against `SUPPORTED_COUNTRIES` in `apiConstants.ts`
- Invalid or duplicate codes are skipped

---

### Step 2: Add Origin and Destination

```typescript
add(from);   // e.g. "IN"
add(to);     // e.g. "AE"
```

**Rationale:** The route-specific markets. Users booking from India to UAE care about Indian OTAs (MakeMyTrip, Cleartrip) and UAE OTAs (Musafir). These are always included.

**Edge case:** If `from === to` (e.g., domestic India → India), both still added; `seen` deduplicates so only one appears.

---

### Step 3: Add Baseline

```typescript
const BASELINE: readonly string[] = ["US"];

for (const b of BASELINE) add(b);
```

**Rationale:** The US market is a common reference. Major OTAs (Expedia, etc.) price in USD and serve a large market. Including US provides a stable baseline for comparison and often surfaces competitive prices on international routes.

---

### Step 4: Add Structural Cheap Markets

```typescript
const STRUCTURAL_CHEAP: readonly string[] = ["VN", "EG"];

for (const s of STRUCTURAL_CHEAP) add(s);
```

| Country | Code | OTA | Why Cheaper |
|---------|------|-----|-------------|
| Vietnam | VN | Traveloka | Traveloka is known for aggressive pricing in Southeast Asia |
| Egypt | EG | Almosafer | Almosafer serves the Middle East with competitive rates |

These markets are **structurally** cheaper — the OTAs in these regions consistently undercut Western markets on many routes.

---

### Step 5: Add Devaluation Wildcards

```typescript
const devals = getRecentDevaluations();   // Returns ["TR", "EG", "AR"]
const usedDevals: string[] = [];

for (const d of devals) {
  if (result.length >= TARGET_COUNT) break;
  if (!seen.has(d.toUpperCase())) {
    add(d);
    usedDevals.push(d.toUpperCase());
  }
}
```

**`getRecentDevaluations()`** is defined in `lib/exchangeRate.ts`:

```typescript
const DEVALUATION_WATCHLIST = ["TR", "EG", "AR"];

export function getRecentDevaluations(): string[] {
  return [...DEVALUATION_WATCHLIST];
}
```

| Country | Code | Currency | Rationale |
|---------|------|----------|------------|
| Turkey | TR | TRY | Turkish Lira has weakened; local OTA prices (e.g., Enuygun) often cheaper when converted to USD |
| Egypt | EG | EGP | Egyptian Pound devaluation; Almosafer/regional OTAs show lower dollar-equivalent prices |
| Argentina | AR | ARS | Argentine Peso volatility; Despegar and local sites can be significantly cheaper |

**Order matters:** TR is first because it historically yields the largest savings on many routes. EG can be a duplicate (already in STRUCTURAL_CHEAP) — `add()` skips it via `seen`. AR is third.

**Why "wildcards"?** Currency weakness is dynamic. These countries are on a watchlist; when their currencies weaken, their local prices (in TRY, EGP, ARS) become cheaper when converted to the user's currency. The engine prioritizes them to capture these opportunities.

---

### Step 6: Pad with Known Cheap OTA Markets

```typescript
const TARGET_COUNT = 8;
const PADDING = ["IN", "BR", "MY", "TH", "PH", "MX", "CO", "PL"];

for (const p of PADDING) {
  if (result.length >= TARGET_COUNT) break;
  add(p);
}
```

If fewer than 8 countries have been added, the engine pads with:

| Code | Country | Representative OTA |
|------|---------|-------------------|
| IN | India | MakeMyTrip, Cleartrip |
| BR | Brazil | Decolar |
| MY | Malaysia | AirAsia, Traveloka |
| TH | Thailand | Traveloka |
| PH | Philippines | Traveloka |
| MX | Mexico | eDreams |
| CO | Colombia | Avianca, local OTAs |
| PL | Poland | Wakacje.pl |

These are large or price-competitive markets. IN is especially important for Indian users (OmniFare's primary audience).

---

### Step 7: Cap and Return

```typescript
return {
  countries: result.slice(0, TARGET_COUNT),
  reasoning: {
    origin: from,
    destination: to,
    baseline: [...BASELINE],
    structural: [...STRUCTURAL_CHEAP],
    devaluationWildcards: usedDevals,
  },
};
```

`result` is capped at 8. The `reasoning` object is for logging and debugging — it shows which tiers contributed to the final list.

---

## Example Flows

### Example 1: Delhi (IN) → Dubai (AE)

```
add(IN)  → result = ["IN"]
add(AE)  → result = ["IN", "AE"]
add(US)  → result = ["IN", "AE", "US"]
add(VN)  → result = ["IN", "AE", "US", "VN"]
add(EG)  → result = ["IN", "AE", "US", "VN", "EG"]
add(TR)  → result = ["IN", "AE", "US", "VN", "EG", "TR"]
add(AR)  → result = ["IN", "AE", "US", "VN", "EG", "TR", "AR"]
add(IN)  → skip (already in seen)
add(BR)  → result = ["IN", "AE", "US", "VN", "EG", "TR", "AR", "BR"]
→ length = 8, stop

Final: ["IN", "AE", "US", "VN", "EG", "TR", "AR", "BR"]
```

---

### Example 2: London (GB) → Tokyo (JP)

```
add(GB)  → result = ["GB"]
add(JP)  → result = ["GB", "JP"]
add(US)  → result = ["GB", "JP", "US"]
add(VN)  → result = ["GB", "JP", "US", "VN"]
add(EG)  → result = ["GB", "JP", "US", "VN", "EG"]
add(TR)  → result = ["GB", "JP", "US", "VN", "EG", "TR"]
add(EG)  → skip (seen)
add(AR)  → result = ["GB", "JP", "US", "VN", "EG", "TR", "AR"]
add(IN)  → result = ["GB", "JP", "US", "VN", "EG", "TR", "AR", "IN"]
→ length = 8, stop

Final: ["GB", "JP", "US", "VN", "EG", "TR", "AR", "IN"]
```

---

## Dependencies

| Module | Usage |
|--------|-------|
| `./exchangeRate` | `getRecentDevaluations()` — devaluation watchlist |
| `./apiConstants` | `isValidCountry(code)` — validates against SUPPORTED_COUNTRIES |

---

## Integration with Search Route

In `app/api/geoarb/search/route.ts`:

```typescript
const fromCC = countryForAirport(origin);   // IATA "DEL" → "IN"
const toCC = countryForAirport(destination); // IATA "DXB" → "AE"
const plan = getPriorityPOS(fromCC, toCC);

// plan.countries = ["IN", "AE", "US", "VN", "EG", "TR", "AR", "BR"]

const { results: posResults } = await fetchAllPOS({
  departureId: origin,
  arrivalId: destination,
  outboundDate: date,
  countries: plan.countries,
  currency: "USD",
});
```

The search route maps **airport IATA codes** to **country codes** via a hardcoded `AIRPORT_COUNTRY` map (e.g., DEL→IN, DXB→AE). Airports not in the map default to `"US"`.

---

## Design Decisions

### Why 8?

A balance between:
- **Coverage:** Enough diversity to catch most GeoArb opportunities
- **API cost:** Each POS = 1 API call; 8 calls per search is manageable
- **Latency:** `fetchAllPOS` batches of 3; 8 countries = 3 batches, ~3× single-call latency

### Why this priority order?

1. **Origin/destination first** — Route-specific, highest relevance
2. **US baseline** — Universal reference, USD pricing
3. **Structural cheap (VN, EG)** — Consistently undercut other markets
4. **Devaluation wildcards** — Time-sensitive opportunities from weak currencies
5. **Padding** — Fill remaining slots with large/competitive markets

### Why not more countries?

- RapidAPI rate limits
- Diminishing returns — after 8–10 diverse markets, additional countries rarely yield new best prices
- Latency and cost scale linearly

### Extending the engine

To add a new country to a tier:

- **Structural cheap:** Append to `STRUCTURAL_CHEAP`
- **Devaluation:** Append to `DEVALUATION_WATCHLIST` in `exchangeRate.ts`
- **Padding:** Append to `PADDING`

Ensure the country is in `SUPPORTED_COUNTRIES` (apiConstants) and `COUNTRY_TO_CURRENCY` (exchangeRate) for conversion to work.
