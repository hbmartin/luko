import { redirect } from "next/navigation"
import type { ReactNode } from "react"

import { createServerSupabaseClient } from "@/lib/supabase/server"

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  return <>{children}</>
}
