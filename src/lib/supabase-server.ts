import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client.
 * Uses the service_role key when available (bypasses RLS),
 * falls back to the anon key otherwise.
 *
 * To upgrade security: add SUPABASE_SERVICE_ROLE_KEY to your env
 * (without NEXT_PUBLIC_ prefix) and enable RLS on all tables.
 */
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  key
);
