import { NextRequest, NextResponse } from "next/server";
import { getBookingDetails } from "@/lib/flightApiService";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    let body: { items?: Array<{ booking_token: string; country_code: string; currency?: string }> };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON with items array." },
        { status: 400 },
      );
    }

    const items = body.items ?? [];
    if (items.length === 0) {
      return NextResponse.json({ results: [] });
    }

    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || !process.env.RAPIDAPI_KEY) {
      return NextResponse.json({ results: [] });
    }

    // Run all getBookingDetails calls concurrently — total wait = slowest success, not sum of batches.
    // Per-call timeout is 20s; the route-level maxDuration=60 acts as a hard ceiling.
    const results = await Promise.all(
      items.map(async (item) => {
        try {
          const options = await getBookingDetails({
            bookingToken: item.booking_token,
            currency: item.currency ?? "USD",
            countryCode: item.country_code,
            timeoutMs: 60_000,
          });
          console.log(`[OmniFare] getBookingDetails OK for ${item.country_code}: ${options.length} providers`);
          return { country_code: item.country_code, options };
        } catch (err) {
          console.warn(`[OmniFare] getBookingDetails failed for ${item.country_code}:`, (err as Error).message);
          return { country_code: item.country_code, options: [] };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[OmniFare] booking-options failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch booking options", detail: String(err) },
      { status: 500 },
    );
  }
}
