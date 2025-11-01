import { createBrowserClient } from "@supabase/ssr"

import { env } from "@/env.mjs"

export function createBrowserSupabaseClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
