# Exchange Rate Service

`lib/exchangeRate.ts` — Live FX rates, conversion, and devaluation watchlist. Used by the search route for currency conversion and by the GeoArb engine for devaluation wildcards.

---

## External API

**Frankfurter API** — `https://api.frankfurter.app`

- Free, no API key
- ECB-sourced rates
- Supports base currency and multiple target currencies

### Endpoint

```
GET https://api.frankfurter.app/latest?base=USD
```

**Response:**
```json
{
  "rates": {
    "EUR": 0.92,
    "GBP": 0.79,
    "INR": 91.1,
    "JPY": 149.5
  }
}
```

---

## Exports

| Function | Purpose |
|----------|---------|
| `getRates(base)` | Fetch/cache rates for a base currency |
| `convert(amount, from, to, bankFeePercent?)` | Convert amount with optional bank fee |
| `getRecentDevaluations()` | Devaluation watchlist (TR, EG, AR) |
| `currencyForCountry(countryCode)` | Map country → currency code |

---

## getRates(base)

### Signature

```typescript
export async function getRates(base: string): Promise<Record<string, number>>
```

### Flow

1. **Cache hit:** If cached rates for `base` are less than 1 hour old → return immediately
2. **Pending dedup:** If a fetch for `base` is in-flight → return that Promise (no duplicate requests)
3. **New fetch:** Call Frankfurter, store in cache, return
4. **On error:** Use `FALLBACK_USD_RATES`, store in cache, return

### Caching

- **TTL:** 1 hour (`CACHE_TTL_MS = 60 * 60 * 1000`)
- **Key:** Base currency (uppercase)
- **Dedup:** `pending` Map ensures at most 1 in-flight request per base

### Fallback

```typescript
const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 91.1, JPY: 149.5, AED: 3.67,
  SGD: 1.34, TRY: 32.1, BRL: 5.16, MYR: 4.72, ARS: 870, EGP: 30.9,
  VND: 24700, NGN: 1550, PKR: 278, KRW: 1330, THB: 35.8, ...
};
```

If Frankfurter is unreachable, fallback rates (approx Feb 2026) are used. For non-USD bases, rates are derived by inverting the USD rate.

**Timeout:** 5 seconds (`AbortSignal.timeout(5_000)`).

---

## convert(amount, from, to, bankFeePercent?)

### Signature

```typescript
export async function convert(
  amount: number,
  from: string,
  to: string,
  bankFeePercent = 3
): Promise<{
  converted: number;
  bankFee: number;
  totalWithFee: number;
  rate: number;
}>
```

### Logic

1. If `from === to` → return `{ converted: amount, bankFee: 0, totalWithFee: amount, rate: 1 }`
2. Fetch `rates` via `getRates(from)`
3. `rate = rates[to]`
4. `converted = round2(amount * rate)`
5. `bankFee = round2(converted * bankFeePercent / 100)`
6. `totalWithFee = round2(converted + bankFee)`

### Usage in Search Route

The search route calls `convert(opt.priceUsd, "USD", userCcy, 0)` — **no bank fee in convert**. The bank fee is applied separately in `applyPricing`:

```typescript
const bankFee = posCcy !== userCcy ? round2(price * 0.03) : 0;
const total = round2(price + bankFee);
```

So the 3% is only charged when the POS currency differs from the user's (foreign transaction fee).

---

## getRecentDevaluations()

```typescript
const DEVALUATION_WATCHLIST = ["TR", "EG", "AR"];

export function getRecentDevaluations(): string[] {
  return [...DEVALUATION_WATCHLIST];
}
```

Returns `["TR", "EG", "AR"]` — used by GeoArb engine for devaluation wildcard POS selection. Static for now; could be extended to fetch from a config or API.

---

## currencyForCountry(countryCode)

### Signature

```typescript
export function currencyForCountry(countryCode: string): string
```

### Mapping

Maps ~40 country codes to ISO 4217 currency codes:

| Country | Currency |
|---------|----------|
| US | USD |
| GB | GBP |
| IN | INR |
| TR | TRY |
| EG | EGP |
| AR | ARS |
| AE | AED |
| VN | VND |
| BR | BRL |
| ... | ... |

**Default:** Unmapped countries return `"USD"`.

Used in `applyPricing` to determine the POS currency for bank-fee logic and for convert calls when needed.

---

## Rounding

All monetary values use `round2(n) = Math.round(n * 100) / 100` to avoid floating-point noise.
