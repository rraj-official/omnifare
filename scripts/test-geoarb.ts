/**
 * Phase 2 — GeoArb Engine Verification
 *
 * Run:  npx tsx scripts/test-geoarb.ts
 *
 * Expects the dev server at http://localhost:3000
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

// ── helpers ──────────────────────────────────────────────────

function green(s: string)  { return `\x1b[32m${s}\x1b[0m`; }
function red(s: string)    { return `\x1b[31m${s}\x1b[0m`; }
function yellow(s: string) { return `\x1b[33m${s}\x1b[0m`; }
function cyan(s: string)   { return `\x1b[36m${s}\x1b[0m`; }
function bold(s: string)   { return `\x1b[1m${s}\x1b[0m`; }

let pass = 0;
let fail = 0;

function assert(label: string, ok: boolean) {
  if (ok) { console.log(green(`  ✓ ${label}`)); pass++; }
  else    { console.log(red(`  ✗ ${label}`));   fail++; }
}

// ── main ─────────────────────────────────────────────────────

async function main() {
  console.log();
  console.log(yellow("═══════════════════════════════════════════════"));
  console.log(yellow("  OmniFare Phase 2 — GeoArb Engine Test"));
  console.log(yellow("═══════════════════════════════════════════════"));
  console.log();

  // ── 1. Search: London → Tokyo ─────────────────────────────
  console.log(bold("▶ Test: POST /api/geoarb/search — LHR → NRT"));
  console.log();

  const res = await fetch(`${BASE}/api/geoarb/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origin: "LHR",
      destination: "NRT",
      date: "2026-04-15",
      cabin_class: "economy",
      passengers: 1,
      user_currency: "USD",
    }),
  });

  const data = await res.json();

  assert("HTTP 200", res.status === 200);
  assert("Engine version is GeoArb v2", data.engine === "GeoArb v2");

  // ── 2. Verify POS plan ────────────────────────────────────
  console.log();
  console.log(bold("▶ POS Selection Plan"));

  const countries: string[] = data.pos_plan?.countries ?? [];
  console.log(`  Countries (${countries.length}): ${countries.join(", ")}`);
  console.log(`  Origin:      ${data.pos_plan?.reasoning?.origin}`);
  console.log(`  Destination:  ${data.pos_plan?.reasoning?.destination}`);
  console.log(`  Wildcards:    ${data.pos_plan?.reasoning?.devaluationWildcards?.join(", ") || "none"}`);
  console.log();

  assert("Returns exactly 8 countries", countries.length === 8);
  assert("Includes origin country (GB)", countries.includes("GB"));
  assert("Includes destination country (JP)", countries.includes("JP"));
  assert("Includes US baseline", countries.includes("US"));
  assert("Includes Vietnam (VN)", countries.includes("VN"));
  assert("Includes Egypt (EG)", countries.includes("EG"));

  const devals = data.pos_plan?.reasoning?.devaluationWildcards ?? [];
  assert("Has devaluation wildcards", devals.length > 0);

  // ── 3. Verify flights & pricing ───────────────────────────
  console.log();
  console.log(bold("▶ Flights & POS Pricing"));

  const flights = data.flights ?? [];
  assert("Has flights", flights.length > 0);
  assert("Each flight has pos_options", flights.every((f: any) => f.pos_options?.length > 0));

  if (flights.length > 0) {
    const first = flights[0];
    console.log();
    console.log(`  ${cyan("Cheapest flight:")} ${first.airline} ${first.flight_number}`);
    console.log(`  ${cyan("Best POS:")} ${first.cheapest_pos} via ${first.cheapest_provider}`);
    console.log(`  ${cyan("Total (incl 3% fee):")} $${first.cheapest_total}`);
    console.log();

    console.log(`  ${"Country".padEnd(8)} ${"Provider".padEnd(20)} ${"Price".padStart(10)} ${"Fee 3%".padStart(10)} ${"Total".padStart(10)} ${"Risk".padStart(8)}`);
    console.log(`  ${"─".repeat(8)} ${"─".repeat(20)} ${"─".repeat(10)} ${"─".repeat(10)} ${"─".repeat(10)} ${"─".repeat(8)}`);

    for (const opt of first.pos_options) {
      const isDevaluation = ["TR", "EG", "AR"].includes(opt.country);
      const tag = isDevaluation ? yellow(" ⚡ DEVAL") : "";
      console.log(
        `  ${opt.country.padEnd(8)} ${opt.provider.padEnd(20)} ${("$" + opt.converted_price.toFixed(2)).padStart(10)} ${("$" + opt.bank_fee.toFixed(2)).padStart(10)} ${("$" + opt.total.toFixed(2)).padStart(10)} ${opt.risk_level.padStart(8)}${tag}`
      );
    }
    console.log();

    // Check 3% bank fee is present
    const withFee = first.pos_options.find((o: any) => o.bank_fee > 0);
    assert("3% bank fee is calculated", !!withFee);
    if (withFee) {
      const expectedFee = Math.round(withFee.converted_price * 0.03 * 100) / 100;
      assert(
        `Bank fee matches 3% (${withFee.bank_fee} ≈ ${expectedFee})`,
        Math.abs(withFee.bank_fee - expectedFee) < 0.02
      );
    }

    // Check devaluation countries are cheaper
    const usOption = first.pos_options.find((o: any) => o.country === "US");
    const trOption = first.pos_options.find((o: any) => o.country === "TR");
    const egOption = first.pos_options.find((o: any) => o.country === "EG");

    if (usOption && trOption) {
      assert(
        `Turkey POS ($${trOption.total.toFixed(2)}) cheaper than US ($${usOption.total.toFixed(2)})`,
        trOption.total < usOption.total
      );
    }
    if (usOption && egOption) {
      assert(
        `Egypt POS ($${egOption.total.toFixed(2)}) cheaper than US ($${usOption.total.toFixed(2)})`,
        egOption.total < usOption.total
      );
    }
  }

  // ── Summary ───────────────────────────────────────────────
  console.log();
  console.log(yellow("═══════════════════════════════════════════════"));
  console.log(`  Results: ${green(`${pass} passed`)}  ${fail > 0 ? red(`${fail} failed`) : "0 failed"}`);
  console.log(yellow("═══════════════════════════════════════════════"));
  console.log();

  process.exit(fail);
}

main().catch((err) => {
  console.error(red(`Fatal: ${err.message}`));
  process.exit(1);
});
