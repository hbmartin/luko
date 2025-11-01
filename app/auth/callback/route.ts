import { NextResponse } from "next/server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { event, session } = await request.json()

  if (event === "SIGNED_OUT") {
    await supabase.auth.signOut()
  }

  if ((event === "TOKEN_REFRESHED" || event === "SIGNED_IN") && session) {
    await supabase.auth.setSession(session)
  }

  return NextResponse.json({ success: true })
}
