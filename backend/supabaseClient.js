import { createClient } from "@supabase/supabase-js"

let supabase

/**
 * Returns a Supabase admin client singleton.
 * Uses the service-role key for backend-to-database access (bypasses RLS).
 * Must be called AFTER process.env is populated by the env-injection middleware.
 */
export function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )
  }
  return supabase
}
