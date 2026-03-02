import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { searchFlightsForPOS, getBookingDetails } from "./lib/flightApiService";

async function run() {
  console.log("=== Testing getBookingDetails API ===");
  console.log("1. Fetching booking tokens via searchFlightsForPOS...");
  
  // Date: 30 days from now
  const date = new Date();
  date.setDate(date.getDate() + 30);
  const outboundDate = date.toISOString().split("T")[0];

  console.log(`Searching LHR -> JFK on ${outboundDate}`);
  const startTimeSearch = Date.now();
  
  let flights;
  try {
    flights = await searchFlightsForPOS({
      departureId: "LHR",
      arrivalId: "JFK",
      outboundDate,
      countryCode: "US",
      currency: "USD",
    });
  } catch (err) {
    console.error("Search failed:", err);
    return;
  }

  const tokens = Array.from(new Set(flights.filter(f => f.bookingToken).map(f => f.bookingToken))).slice(0, 6) as string[];
  
  console.log(`Found ${flights.length} flights in ${Date.now() - startTimeSearch}ms.`);
  console.log(`Extracted ${tokens.length} unique booking tokens.`);
  
  if (tokens.length === 0) {
    console.error("No booking tokens found. Cannot proceed.");
    return;
  }

  console.log("\n--------------------------------------------------");
  console.log("2. Testing SEQUENTIAL Calls");
  console.log("--------------------------------------------------");
  
  const seqStart = Date.now();
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const callStart = Date.now();
    try {
      console.log(`[Seq] Fetching token ${i + 1}/${tokens.length}...`);
      const options = await getBookingDetails({ bookingToken: token, countryCode: "US", timeoutMs: 60000 });
      console.log(`[Seq] Token ${i + 1} SUCCESS: ${options.length} providers (took ${Date.now() - callStart}ms)`);
    } catch (err: any) {
      console.error(`[Seq] Token ${i + 1} FAILED: ${err.message} (took ${Date.now() - callStart}ms)`);
    }
  }
  const seqTotal = Date.now() - seqStart;
  console.log(`\n=> Sequential Total Time: ${seqTotal}ms`);


  console.log("\n--------------------------------------------------");
  console.log("3. Testing CONCURRENT Calls");
  console.log("--------------------------------------------------");
  
  const concStart = Date.now();
  const promises = tokens.map(async (token, i) => {
    const callStart = Date.now();
    try {
      const options = await getBookingDetails({ bookingToken: token, countryCode: "US", timeoutMs: 60000 });
      console.log(`[Conc] Token ${i + 1} SUCCESS: ${options.length} providers (took ${Date.now() - callStart}ms)`);
    } catch (err: any) {
      console.error(`[Conc] Token ${i + 1} FAILED: ${err.message} (took ${Date.now() - callStart}ms)`);
    }
  });

  await Promise.all(promises);
  const concTotal = Date.now() - concStart;
  console.log(`\n=> Concurrent Total Time: ${concTotal}ms`);
}

run().catch(console.error);
