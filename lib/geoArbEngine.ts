/**
 * GeoArb Selection Engine
 *
 * Decides which 8 Points of Sale to query for a given route.
 * Prioritises: origin country, destination country, US baseline,
 * Vietnam & Egypt (structurally cheap OTAs), then devaluation wildcards.
 */

import { getRecentDevaluations } from "./exchangeRate";
import { isValidCountry } from "./apiConstants";

const STRUCTURAL_CHEAP: readonly string[] = ["VN", "EG"];
const BASELINE: readonly string[] = ["US"];
const TARGET_COUNT = 8;

export interface GeoArbPlan {
  countries: string[];
  reasoning: {
    origin: string;
    destination: string;
    baseline: string[];
    structural: string[];
    devaluationWildcards: string[];
  };
}

export function getPriorityPOS(
  fromCountryCode: string,
  toCountryCode: string
): GeoArbPlan {
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

  add(from);
  add(to);
  for (const b of BASELINE) add(b);
  for (const s of STRUCTURAL_CHEAP) add(s);

  const devals = getRecentDevaluations();
  const usedDevals: string[] = [];
  for (const d of devals) {
    if (result.length >= TARGET_COUNT) break;
    if (!seen.has(d.toUpperCase())) {
      add(d);
      usedDevals.push(d.toUpperCase());
    }
  }

  // If still under 8, pad with known cheap OTA markets
  const PADDING = ["IN", "BR", "MY", "TH", "PH", "MX", "CO", "PL"];
  for (const p of PADDING) {
    if (result.length >= TARGET_COUNT) break;
    add(p);
  }

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
}
