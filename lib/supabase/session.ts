import type { Session } from "@supabase/supabase-js"
import { headers } from "next/headers"

export function getSessionFromHeaders(): Session | null {
  const headerList = headers()
  const encodedSession = headerList.get("x-supabase-session")

  if (!encodedSession) {
    return null
  }

  try {
    return JSON.parse(encodedSession) as Session
  } catch {
    return null
  }
}
