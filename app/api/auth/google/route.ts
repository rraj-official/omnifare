import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID) {
        return NextResponse.json({ error: "Missing GOOGLE_CLIENT_ID" }, { status: 500 });
    }

    const { origin } = new URL(request.url);
    const redirectUri = `${origin}/api/auth/google/callback`;

    const scope = "email profile openid";
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        redirectUri
    )}&response_type=code&scope=${encodeURIComponent(
        scope
    )}&access_type=offline&prompt=consent`;

    return NextResponse.redirect(url);
}
