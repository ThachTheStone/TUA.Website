"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Anon-key browser client. Only reads what RLS allows the public to read. */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
