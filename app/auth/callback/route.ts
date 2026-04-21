import { NextResponse } from "next/server"
import { z } from "zod"

import { createMutableServerSupabaseClient } from "@/lib/supabase/server"

const sessionSyncSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
})

const callbackSchema = z.object({
  event: z.enum(["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "USER_UPDATED", "PASSWORD_RECOVERY"]),
  session: sessionSyncSchema.nullable().optional(),
})

const authErrorResponse = (error: string, status: number) => NextResponse.json({ success: false, error }, { status })

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return authErrorResponse("Invalid JSON payload", 400)
  }

  const parsedBody = callbackSchema.safeParse(body)

  if (!parsedBody.success) {
    return authErrorResponse("Invalid payload", 400)
  }

  const { event, session } = parsedBody.data
  const supabase = await createMutableServerSupabaseClient()

  if (event === "SIGNED_OUT") {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        return authErrorResponse("Unable to sign out", 500)
      }
    } catch {
      return authErrorResponse("Unable to sign out", 500)
    }

    return NextResponse.json({ success: true })
  }

  if (!session) {
    return authErrorResponse("Missing session", 400)
  }

  let setSessionError: Error | undefined
  try {
    const result = await supabase.auth.setSession(session)
    setSessionError = result.error ?? undefined
  } catch {
    return authErrorResponse("Unable to update session", 500)
  }

  if (setSessionError) {
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        return authErrorResponse("Unable to clear invalid session", 500)
      }
    } catch {
      return authErrorResponse("Unable to clear invalid session", 500)
    }
    return authErrorResponse("Invalid session", 401)
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        return authErrorResponse("Unable to clear invalid session", 500)
      }
    } catch {
      return authErrorResponse("Unable to clear invalid session", 500)
    }
    return authErrorResponse("Invalid session", 401)
  }

  return NextResponse.json({ success: true })
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const nextParameter = requestUrl.searchParams.get("next")
  const next = nextParameter && nextParameter.startsWith("/") && !nextParameter.startsWith("//") ? nextParameter : "/"

  if (code) {
    const supabase = await createMutableServerSupabaseClient()

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        // NextResponse.redirect requires an absolute URL; keep redirect scoped to the app origin.
        const redirectUrl = new URL(next, requestUrl.origin)
        return NextResponse.redirect(redirectUrl)
      }

      const redirectWithError = `${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`
      return NextResponse.redirect(redirectWithError)
    } catch {
      const redirectWithError = `${requestUrl.origin}/login?error=${encodeURIComponent("Unable to complete sign in")}`
      return NextResponse.redirect(redirectWithError)
    }
  }

  const missingCodeRedirect = `${requestUrl.origin}/login?error=${encodeURIComponent("Missing authentication code")}`
  return NextResponse.redirect(missingCodeRedirect)
}
