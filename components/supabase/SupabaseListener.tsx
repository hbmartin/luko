"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { useSupabase } from "./SupabaseProvider"

export function SupabaseListener() {
  const router = useRouter()
  const { supabase, setSession } = useSupabase()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)

      if (event === "INITIAL_SESSION") {
        return
      }

      try {
        await fetch("/auth/callback", {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({ event, session }),
        })
      } catch (error) {
        console.error("Failed to sync auth state", error)
      }

      if (event === "SIGNED_OUT") {
        router.push("/login")
      }

      router.refresh()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, setSession, supabase])

  return null
}
