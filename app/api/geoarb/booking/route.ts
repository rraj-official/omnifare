import { NextRequest, NextResponse } from "next/server";
import { getBookingDetails, getBookingURL } from "@/lib/flightApiService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_token, currency = "USD", country_code = "US" } = body;

    if (!booking_token) {
      return NextResponse.json(
        { error: "Missing required field: booking_token" },
        { status: 400 },
      );
    }

    const hasApiKey = !!process.env.RAPIDAPI_KEY;
    if (!hasApiKey) {
      return NextResponse.json(
        { error: "RAPIDAPI_KEY not configured" },
        { status: 503 },
      );
    }

    console.log(`[OmniFare Booking] getBookingDetails for token=${booking_token.slice(0, 30)}… cc=${country_code} ccy=${currency}`);
    const options = await getBookingDetails({
      bookingToken: booking_token,
      currency,
      countryCode: country_code,
    });
    console.log(`[OmniFare Booking] Got ${options.length} booking options`);

    let bookingUrl: string | null = null;
    const bestOption = options[0];
    if (bestOption?.token) {
      try {
        console.log(`[OmniFare Booking] Fetching bookingURL for provider=${bestOption.title}`);
        bookingUrl = await getBookingURL({
          bookingToken: bestOption.token,
          currency,
          countryCode: country_code,
        });
        console.log(`[OmniFare Booking] Got bookingURL: ${bookingUrl?.slice(0, 80)}…`);
      } catch (urlErr) {
        console.warn(`[OmniFare Booking] getBookingURL failed: ${urlErr}. Falling back to website.`);
      }
    }

    if (!bookingUrl && bestOption?.website) {
      bookingUrl = bestOption.website.startsWith("http")
        ? bestOption.website
        : `https://${bestOption.website}`;
      console.log(`[OmniFare Booking] Using website fallback: ${bookingUrl}`);
    }

    return NextResponse.json({
      options,
      booking_url: bookingUrl,
    });
  } catch (err) {
    console.error(`[OmniFare Booking] FAILED:`, err instanceof Error ? err.message : err);
    return NextResponse.json(
      {
        error: "Booking details failed",
        detail: err instanceof Error ? err.message : "Unknown",
      },
      { status: 500 },
    );
  }
}
