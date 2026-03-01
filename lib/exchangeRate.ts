/**
 * ExchangeRateService
 *
 * Fetches live FX rates from the Frankfurter API (free, no key).
 * Caches results for 1 hour per base currency.
 * convert() adds a configurable bank-fee safety buffer (default 3%).
 */

// api.frankfurter.app is the canonical Frankfurter endpoint (ECB data, free, no key)
const FRANKFURTER_BASE = "https://api.frankfurter.app";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface RateCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

const cache = new Map<string, RateCache>();
// Dedup map: prevents >1 simultaneous network fetch for the same base currency
const pending = new Map<string, Promise<Record<string, number>>>();

// Fallback hardcoded rates (USD base, Feb 2026) — used only if Frankfurter is unreachable
const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 91.1, JPY: 149.5, AED: 3.67,
  SGD: 1.34, TRY: 32.1, BRL: 5.16, MYR: 4.72, ARS: 870, EGP: 30.9,
  VND: 24700, NGN: 1550, PKR: 278, KRW: 1330, THB: 35.8, IDR: 16800,
  PHP: 56.5, MXN: 17.2, COP: 3900, CLP: 900, ZAR: 18.6, KES: 135,
  BDT: 110, LKR: 320, NPR: 134, CNY: 7.24, HKD: 7.82, TWD: 31.8,
  AUD: 1.53, NZD: 1.63, CAD: 1.36, SEK: 10.6, NOK: 10.8, DKK: 6.89,
  CHF: 0.9, PLN: 3.98, CZK: 23.0, HUF: 360, RON: 4.57, RUB: 90,
  UAH: 38, SAR: 3.75, QAR: 3.64, KWD: 0.31, BHD: 0.38, OMR: 0.385,
};

function fallbackRatesFor(key: string): Record<string, number> {
  if (key === "USD") return { ...FALLBACK_USD_RATES };
  const baseRate = FALLBACK_USD_RATES[key];
  if (!baseRate) return { ...FALLBACK_USD_RATES };
  const derived: Record<string, number> = { [key]: 1 };
  for (const [ccy, usdRate] of Object.entries(FALLBACK_USD_RATES)) {
    derived[ccy] = round2(usdRate / baseRate);
  }
  return derived;
}

// ── Fetch & cache (with request deduplication) ───────────────
//
// Key invariant: at most ONE network request per base currency is in-flight
// at any time. All concurrent callers share the same Promise. Once resolved
// (live or fallback) the result is stored in `cache` so subsequent calls
// within CACHE_TTL_MS never hit the network.

export async function getRates(
  base: string
): Promise<Record<string, number>> {
  const key = base.toUpperCase();

  // 1. Cache hit — no network needed
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rates;
  }

  // 2. Already fetching — share the in-flight Promise
  if (pending.has(key)) {
    return pending.get(key)!;
  }

  // 3. Start a new fetch; dedup all concurrent callers onto this Promise
  const fetchPromise: Promise<Record<string, number>> = (async () => {
    try {
      const url = `${FRANKFURTER_BASE}/latest?base=${key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      const json = (await res.json()) as { rates: Record<string, number> };
      const rates = { ...json.rates, [key]: 1 };
      cache.set(key, { rates, fetchedAt: Date.now() });
      return rates;
    } catch (err) {
      // Cache the fallback so the next 1,000 concurrent callers don't retry
      console.warn(`[OmniFare] FX rate fetch failed (base=${key}): ${err}. Using built-in fallback.`);
      const rates = fallbackRatesFor(key);
      cache.set(key, { rates, fetchedAt: Date.now() });
      return rates;
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, fetchPromise);
  return fetchPromise;
}

// ── Convert ──────────────────────────────────────────────────

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
}> {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  if (fromUpper === toUpper) {
    return { converted: amount, bankFee: 0, totalWithFee: amount, rate: 1 };
  }

  const rates = await getRates(fromUpper);
  const rate = rates[toUpper];

  if (rate === undefined) {
    throw new Error(
      `No rate found for ${fromUpper} → ${toUpper}. Available: ${Object.keys(rates).join(", ")}`
    );
  }

  const converted = round2(amount * rate);
  const bankFee = round2(converted * (bankFeePercent / 100));
  const totalWithFee = round2(converted + bankFee);

  return { converted, bankFee, totalWithFee, rate };
}

// ── Devaluation watchlist ────────────────────────────────────

const DEVALUATION_WATCHLIST = ["TR", "EG", "AR"];

export function getRecentDevaluations(): string[] {
  return [...DEVALUATION_WATCHLIST];
}

// ── Country code → currency mapping ──────────────────────────

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD",
  GB: "GBP",
  TR: "TRY",
  EG: "EGP",
  AR: "ARS",
  VN: "VND",
  IN: "INR",
  BR: "BRL",
  AE: "AED",
  SG: "SGD",
  DE: "EUR",
  FR: "EUR",
  JP: "JPY",
  KR: "KRW",
  TH: "THB",
  MY: "MYR",
  ID: "IDR",
  PH: "PHP",
  MX: "MXN",
  CO: "COP",
  CL: "CLP",
  ZA: "ZAR",
  NG: "NGN",
  KE: "KES",
  PK: "PKR",
  BD: "BDT",
  LK: "LKR",
  NP: "NPR",
  CN: "CNY",
  HK: "HKD",
  TW: "TWD",
  AU: "AUD",
  NZ: "NZD",
  CA: "CAD",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  CH: "CHF",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  RU: "RUB",
  UA: "UAH",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  BH: "BHD",
  OM: "OMR",
};

export function currencyForCountry(countryCode: string): string {
  return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] ?? "USD";
}

// ── Helpers ──────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
