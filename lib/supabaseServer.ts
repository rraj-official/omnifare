import { createSmartClient as createClient } from "supadns-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function getServiceClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase server env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}
