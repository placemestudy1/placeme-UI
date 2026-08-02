import { createClient } from "@supabase/supabase-js";

// Shared Supabase browser client, configured from Vite env vars.
//
// Exports:
// - supabase: the app-wide Supabase client instance (auth + data access).
const url = import.meta.env["VITE_SUPABASE_URL"];
const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"];

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env.local.",
  );
}

export const supabase = createClient(url, anonKey);
