import { NextRequest, NextResponse } from "next/server";
import { getBookingDetails } from "@/lib/flightApiService";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    let body: { booking_token?: string; currency?: string; country_code?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const { booking_token, currency = "USD", country_code = "US" } = body;

    if (!booking_token) {
      return NextResponse.json(
        { error: "Missing booking_token" },
        { status: 400 },
      );
    }

    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || !process.env.RAPIDAPI_KEY) {
      return NextResponse.json({ options: [] });
    }

    console.log(`[OmniFare] getBookingDetails token=${booking_token.slice(0, 30)}… cc=${country_code} ccy=${currency}`);
    const options = await getBookingDetails({ bookingToken: booking_token, currency, countryCode: country_code });
    console.log(`[OmniFare] getBookingDetails → ${options.length} providers: ${options.map((o) => o.title).join(", ")}`);

    return NextResponse.json({ options });
  } catch (err) {
    console.error("[OmniFare] booking-details failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch booking details", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
