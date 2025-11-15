import { redirect } from "next/navigation"
import type { ReactNode } from "react"

import { getSessionFromHeaders } from "@/lib/supabase/session"

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = getSessionFromHeaders()

  if (!session) {
    redirect("/login")
  }

  return <>{children}</>
}
