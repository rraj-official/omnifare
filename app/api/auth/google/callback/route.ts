import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabaseServer";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
        console.error("[OmniFare] Google OAuth Error:", error);
        return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
        return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
    }

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.error("[OmniFare] Missing Google OAuth credentials in .env.local");
        return NextResponse.redirect(`${origin}/?error=Configuration missing`);
    }

    const redirectUri = `${origin}/api/auth/google/callback`;

    try {
        // 1. Exchange the code for tokens from Google
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        if (!tokenResponse.ok) {
            const errData = await tokenResponse.json();
            console.error("[OmniFare] Google Token Exchange Error:", errData);
            return NextResponse.redirect(`${origin}/?error=Failed to exchange token`);
        }

        const tokenData = await tokenResponse.json();
        const idToken = tokenData.id_token;

        if (!idToken) {
            console.error("[OmniFare] Missing id_token in Google response");
            return NextResponse.redirect(`${origin}/?error=Missing ID token`);
        }

        // 2. Sign in to Supabase using the ID token
        const supabase = getServiceClient();
        const { data, error: signInError } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: idToken,
        });

        if (signInError) {
            console.error("[OmniFare] Supabase SignIn Error:", signInError);
            return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(signInError.message)}`);
        }

        // 3. We have the session. We need to pass the access_token and refresh_token
        // back to the client so it can persist them in local storage.
        // The standard way Supabase does this is via the URL hash.
        const accessToken = data.session?.access_token;
        const refreshToken = data.session?.refresh_token;

        if (!accessToken || !refreshToken) {
            console.error("[OmniFare] Missing session tokens from Supabase");
            return NextResponse.redirect(`${origin}/?error=Session failed`);
        }

        return NextResponse.redirect(
            `${origin}/#access_token=${accessToken}&refresh_token=${refreshToken}&type=recovery`
        );

    } catch (err) {
        console.error("[OmniFare] OAuth Callback Exception:", err);
        return NextResponse.redirect(`${origin}/?error=Internal server error`);
    }
}
