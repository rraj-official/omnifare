import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({
      status: "online",
      database: "not_configured",
      engine: "GeoArb",
      message: "Supabase env vars not set. Copy .env.local.example → .env.local",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(url, key);

    const start = Date.now();
    const { error } = await sb.from("profiles").select("id").limit(1).maybeSingle();
    const latencyMs = Date.now() - start;

    if (error) {
      return NextResponse.json(
        {
          status: "degraded",
          database: "error",
          engine: "GeoArb",
          error: error.message,
          latency_ms: latencyMs,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "online",
      database: "connected",
      engine: "GeoArb",
      latency_ms: latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "offline",
        database: "unreachable",
        engine: "GeoArb",
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
