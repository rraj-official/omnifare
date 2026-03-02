import { NextRequest, NextResponse } from "next/server";
import { getBookingURL } from "@/lib/flightApiService";

export const maxDuration = 60;

// Takes the provider-level token from getBookingDetails and returns the deeplink URL.
export async function POST(request: NextRequest) {
  try {
    let body: { token?: string; currency?: string; country_code?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON with token." },
        { status: 400 },
      );
    }

    const { token, currency = "USD", country_code = "US" } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Missing required field: token" },
        { status: 400 },
      );
    }

    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") {
      return NextResponse.json(
        { error: "Booking is not available in mock mode. Set NEXT_PUBLIC_USE_MOCK_DATA=false in .env.local" },
        { status: 503 },
      );
    }

    if (!process.env.RAPIDAPI_KEY) {
      return NextResponse.json(
        { error: "RAPIDAPI_KEY not configured" },
        { status: 503 },
      );
    }

    console.log(`[OmniFare] getBookingURL token=${token.slice(0, 30)}… cc=${country_code} ccy=${currency}`);
    const bookingUrl = await getBookingURL({ bookingToken: token, currency, countryCode: country_code });
    console.log(`[OmniFare] getBookingURL → ${bookingUrl.slice(0, 80)}…`);

    return NextResponse.json({ booking_url: bookingUrl });
  } catch (err) {
    console.error("[OmniFare] getBookingURL failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to get booking URL. Please try again.", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 502 },
    );
  }
}
