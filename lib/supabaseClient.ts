import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// For the global client, we provide a valid dummy URL during SSR if we can't get the origin,
// but the actual client fetches in useAuth happen client-side where `window` is available.
const isBrowser = typeof window !== "undefined";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// The proxy URL must be absolute — Supabase rejects relative paths like "/api/supabase"
const proxyUrl = isBrowser ? window.location.origin + "/api/supabase" : supabaseUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars. Copy .env.local.example → .env.local and fill in your keys."
    );
  }
  if (!_client) {
    // If we're on the server and proxyUrl is relative, it will crash.
    // However, isBrowser logic above handles this by returning supabaseUrl on the server.
    _client = createClient(proxyUrl, supabaseAnonKey);
  }
  return _client;
}

// Global client export: If on the server, we MUST provide an absolute URL.
// The `proxyUrl` is absolute on the server (it equals supabaseUrl),
// but if for some reason it's not, we must provide a valid URL.
export const supabase = supabaseAnonKey
  ? createClient(isBrowser ? window.location.origin + "/api/supabase" : supabaseUrl, supabaseAnonKey)
  : (null as unknown as SupabaseClient);
