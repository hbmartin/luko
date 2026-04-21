import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { env } from "@/env.mjs"

type ServerSupabaseClientOptions = {
  suppressCookieWriteErrors?: boolean
}

async function createSupabaseClient({ suppressCookieWriteErrors = true }: ServerSupabaseClientOptions = {}) {
  const cookieStore = await cookies()

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        if (suppressCookieWriteErrors) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set({ name, value, ...options })
            }
          } catch {
            // Server Components cannot always write cookies. Middleware refreshes
            // the session cookie before protected UI renders.
          }
          return
        }

        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set({ name, value, ...options })
        }
      },
    },
  })
}

export async function createServerSupabaseClient() {
  return createSupabaseClient()
}

export async function createMutableServerSupabaseClient() {
  return createSupabaseClient({ suppressCookieWriteErrors: false })
}
