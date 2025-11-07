import type { Session } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { z } from "zod"

import { createServerSupabaseClient } from "@/lib/supabase/server"

const callbackSchema = z.object({
  event: z.enum(["SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "USER_UPDATED"]),
  session: z
    .custom<Session | null>((value) => value === null || typeof value === "object", "Invalid session")
    .optional(),
})

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 })
  }

  const parsedBody = callbackSchema.safeParse(body)

  if (!parsedBody.success) {
    return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 })
  }

  const { event, session } = parsedBody.data
  const supabase = createServerSupabaseClient()

  if (event === "SIGNED_OUT") {
    await supabase.auth.signOut()
  }

  if ((event === "TOKEN_REFRESHED" || event === "SIGNED_IN") && session) {
    await supabase.auth.setSession(session)
  }

  return NextResponse.json({ success: true })
}
