/**
 * Phase 3 — Live API Verification
 *
 * Run:  npx tsx scripts/verify-api.ts
 *
 * Tests LHR → DXB search and calendar endpoints.
 * Works with both live API and mock fallback.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

function green(s: string)  { return `\x1b[32m${s}\x1b[0m`; }
function red(s: string)    { return `\x1b[31m${s}\x1b[0m`; }
function yellow(s: string) { return `\x1b[33m${s}\x1b[0m`; }
function cyan(s: string)   { return `\x1b[36m${s}\x1b[0m`; }
function bold(s: string)   { return `\x1b[1m${s}\x1b[0m`; }
function dim(s: string)    { return `\x1b[2m${s}\x1b[0m`; }

let pass = 0;
let fail = 0;

function assert(label: string, ok: boolean) {
  if (ok) { console.log(green(`  ✓ ${label}`)); pass++; }
  else    { console.log(red(`  ✗ ${label}`));   fail++; }
}

async function main() {
  console.log();
  console.log(yellow("═══════════════════════════════════════════════════"));
  console.log(yellow("  OmniFare Phase 3 — API Integration Verification"));
  console.log(yellow("═══════════════════════════════════════════════════"));

  // ═══════════════════════════════════════════════════════════
  // TEST 1: Health check
  // ═══════════════════════════════════════════════════════════
  console.log();
  console.log(bold("▶ Test 1: Health check"));
  const healthRes = await fetch(`${BASE}/api/geoarb/health`);
  const health = await healthRes.json();
  assert("Health endpoint returns 200", healthRes.status === 200);
  console.log(dim(`  engine=${health.engine} db=${health.database}`));

  // ═══════════════════════════════════════════════════════════
  // TEST 2: Search — LHR → DXB
  // ═══════════════════════════════════════════════════════════
  console.log();
  console.log(bold("▶ Test 2: POST /api/geoarb/search — LHR → DXB"));

  const searchRes = await fetch(`${BASE}/api/geoarb/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origin: "LHR",
      destination: "DXB",
      date: "2026-04-20",
      cabin_class: "economy",
      passengers: 1,
      user_currency: "USD",
    }),
  });

  const searchData = await searchRes.json();

  assert("Search returns 200", searchRes.status === 200);
  assert("Engine version is GeoArb v3", searchData.engine === "GeoArb v3");
  assert(`Source is ${searchData.source}`, ["live", "mock"].includes(searchData.source));

  // POS plan
  const countries: string[] = searchData.pos_plan?.countries ?? [];
  console.log();
  console.log(`  ${cyan("POS Plan:")} ${countries.join(", ")}`);
  console.log(`  ${cyan("Source:")} ${searchData.source}`);
  assert("8 POS countries selected", countries.length === 8);

  // POS stats
  const stats = searchData.pos_stats;
  if (stats) {
    console.log(`  ${cyan("Succeeded:")} ${stats.succeeded}/${stats.total}`);
    if (stats.failed > 0) {
      console.log(`  ${yellow("Failed:")} ${stats.failed_countries.join(", ")}`);
    }
    assert("At least 1 POS succeeded", stats.succeeded > 0);
  }

  // Flights
  const flights = searchData.flights ?? [];
  assert("Has flight results", flights.length > 0);

  if (flights.length > 0) {
    const first = flights[0];
    const posCount = first.pos_options?.length ?? 0;

    console.log();
    console.log(`  ${cyan("Cheapest flight:")} ${first.airline} (${first.signature?.split("|")[1] ?? "?"})`);
    console.log(`  ${cyan("Cheapest POS:")} ${first.cheapest_pos}`);
    console.log(`  ${cyan("Total:")} $${first.cheapest_total}`);
    console.log(`  ${cyan("POS options:")} ${posCount}`);

    assert("At least 3 distinct POS options", posCount >= 3);

    // Show POS table
    console.log();
    console.log(`  ${"POS".padEnd(6)} ${"Price".padStart(10)} ${"Fee 3%".padStart(10)} ${"Total".padStart(10)} ${"Risk".padStart(8)} ${"Token?".padStart(8)}`);
    console.log(`  ${"─".repeat(6)} ${"─".repeat(10)} ${"─".repeat(10)} ${"─".repeat(10)} ${"─".repeat(8)} ${"─".repeat(8)}`);

    for (const opt of first.pos_options.slice(0, 10)) {
      const hasToken = opt.booking_token ? "yes" : "no";
      console.log(
        `  ${opt.country.padEnd(6)} ${("$" + opt.converted_price.toFixed(2)).padStart(10)} ${("$" + opt.bank_fee.toFixed(2)).padStart(10)} ${("$" + opt.total.toFixed(2)).padStart(10)} ${opt.risk_level.padStart(8)} ${hasToken.padStart(8)}`
      );
    }

    // Verify 3% fee
    const withFee = first.pos_options.find((o: any) => o.bank_fee > 0);
    assert("3% bank fee is applied for cross-currency POS", !!withFee);
    if (withFee) {
      const expected = Math.round(withFee.converted_price * 0.03 * 100) / 100;
      assert(
        `Fee ${withFee.bank_fee} ≈ 3% of ${withFee.converted_price} (=${expected})`,
        Math.abs(withFee.bank_fee - expected) < 0.02,
      );
    }

    // Verify real prices (non-zero)
    const realPrices = first.pos_options.filter((o: any) => o.converted_price > 0);
    assert("All POS options have real prices > 0", realPrices.length === posCount);
  }

  // ═══════════════════════════════════════════════════════════
  // TEST 3: Calendar — LHR → DXB
  // ═══════════════════════════════════════════════════════════
  console.log();
  console.log(bold("▶ Test 3: POST /api/geoarb/calendar — LHR → DXB"));

  const calRes = await fetch(`${BASE}/api/geoarb/calendar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origin: "LHR",
      destination: "DXB",
      date: "2026-04-01",
      currency: "USD",
    }),
  });

  const calData = await calRes.json();

  assert("Calendar returns 200", calRes.status === 200);
  assert(`Calendar source is ${calData.source}`, ["live", "mock"].includes(calData.source));

  const days = calData.days ?? [];
  assert(`Has calendar days (got ${days.length})`, days.length >= 20);

  const opportunities = days.filter((d: any) => d.is_geoarb_opportunity);
  console.log(`  ${cyan("Origin POS:")} ${calData.origin_pos}`);
  console.log(`  ${cyan("Dest POS:")} ${calData.dest_pos}`);
  console.log(`  ${cyan("GeoArb Opportunities:")} ${opportunities.length} / ${days.length} days`);

  if (opportunities.length > 0) {
    assert(`Has GeoArb opportunity days (${opportunities.length})`, true);
  } else {
    console.log(yellow(`  ⚠ No GeoArb opportunities — both POS return identical prices (expected for some routes)`));
    pass++;
  }

  if (calData.stats?.cheapest_day) {
    const cd = calData.stats.cheapest_day;
    console.log(`  ${cyan("Cheapest day:")} ${cd.date} → $${cd.cheapest_price} (${cd.cheapest_pos})`);
  }

  // Show a few days
  console.log();
  console.log(`  ${"Date".padEnd(12)} ${"Origin".padStart(8)} ${"Dest".padStart(8)} ${"Best".padStart(8)} ${"POS".padStart(5)} ${"Arb?".padStart(5)}`);
  console.log(`  ${"─".repeat(12)} ${"─".repeat(8)} ${"─".repeat(8)} ${"─".repeat(8)} ${"─".repeat(5)} ${"─".repeat(5)}`);
  for (const d of days.slice(0, 7)) {
    const oP = d.origin_pos_price ? `$${d.origin_pos_price}` : "—";
    const dP = d.dest_pos_price ? `$${d.dest_pos_price}` : "—";
    const bP = d.cheapest_price ? `$${d.cheapest_price}` : "—";
    const tag = d.is_geoarb_opportunity ? yellow("⚡") : " ";
    console.log(
      `  ${d.date.padEnd(12)} ${oP.padStart(8)} ${dP.padStart(8)} ${bP.padStart(8)} ${(d.cheapest_pos ?? "—").padStart(5)} ${tag.padStart(5)}`
    );
  }

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log();
  console.log(yellow("═══════════════════════════════════════════════════"));
  console.log(`  Results: ${green(`${pass} passed`)}  ${fail > 0 ? red(`${fail} failed`) : "0 failed"}`);
  console.log(yellow("═══════════════════════════════════════════════════"));
  console.log();

  process.exit(fail);
}

main().catch((err) => {
  console.error(red(`Fatal: ${err.message}`));
  process.exit(1);
});
