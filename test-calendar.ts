import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getCalendarForPOS } from "./lib/flightApiService";

async function run() {
    console.log("=== Testing getCalendarPicker API ===");

    // Date: 30 days from now
    const date = new Date();
    date.setDate(date.getDate() + 30);
    const outboundDate = date.toISOString().split("T")[0];

    console.log(`Searching Calendar for LHR -> JFK from ${outboundDate}`);
    const startTime = Date.now();

    try {
        const calendar = await getCalendarForPOS({
            departureId: "LHR",
            arrivalId: "JFK",
            outboundDate,
            countryCode: "US",
            currency: "INR",
        });
        console.log(`Received calendar with ${calendar.days.length} days in ${Date.now() - startTime}ms.`);
        console.log("Sample of days:");
        console.log(calendar.days.slice(0, 10));
    } catch (err) {
        console.error("Calendar fetch failed:", err);
    }
}

run().catch(console.error);
