import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/env.mjs"

type CookieToSet = {
  name: string
  value: string
  options?: Parameters<NextResponse["cookies"]["set"]>[2]
}

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  const cookiesToSet: CookieToSet[] = []

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSetFromSupabase) {
        for (const { name, value, options } of cookiesToSetFromSupabase) {
          request.cookies.set(name, value)
          cookiesToSet.push({ name, value, options })
        }
      },
    },
  })

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const {
    data: { session },
  } = await supabase.auth.getSession()

  requestHeaders.set("x-supabase-session", session ? JSON.stringify(session) : "")

  const shouldProtectRoute =
    request.nextUrl.pathname !== "/" &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")

  const applyCookies = (response: NextResponse) => {
    for (const { name, value, options } of cookiesToSet) {
      response.cookies.set(name, value, options)
    }
    return response
  }

  if (shouldProtectRoute && !user) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return applyCookies(NextResponse.redirect(url))
  }

  return applyCookies(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  )
}
