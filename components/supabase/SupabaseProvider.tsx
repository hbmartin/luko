"use client"

import type { Session, SupabaseClient } from "@supabase/supabase-js"
import { createContext, type ReactNode, useContext, useState } from "react"

import { createBrowserSupabaseClient } from "@/lib/supabase/browser"

type SupabaseContextValue = {
  supabase: SupabaseClient
  session: Session | null
  setSession: (session: Session | null) => void
}

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined)

export function SupabaseProvider({ children, session }: { children: ReactNode; session: Session | null }) {
  const [supabase] = useState(() => createBrowserSupabaseClient())
  const [currentSession, setCurrentSession] = useState<Session | null>(session)

  return (
    <SupabaseContext.Provider value={{ supabase, session: currentSession, setSession: setCurrentSession }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error("useSupabase must be used within a SupabaseProvider")
  }

  return context
}
