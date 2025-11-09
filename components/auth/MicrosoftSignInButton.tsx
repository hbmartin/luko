"use client"

import { useState } from "react"

import { useSupabase } from "@/components/supabase/SupabaseProvider"
import { AUTH_CALLBACK_URL } from "@/lib/auth"
import { cn } from "@/lib/utils"

type MicrosoftSignInButtonProperties = {
  onErrorChange?: (message: string | null) => void
  className?: string
}

export function MicrosoftSignInButton({ onErrorChange, className }: MicrosoftSignInButtonProperties) {
  const { supabase } = useSupabase()
  const [isLoading, setIsLoading] = useState(false)

  const handleMicrosoftSignIn = async () => {
    onErrorChange?.(null)
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: AUTH_CALLBACK_URL,
        scopes: "email", // Azure OAuth requires requesting the email scope (see azure.html).
      },
    })

    if (error) {
      onErrorChange?.(error.message)
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleMicrosoftSignIn}
      disabled={isLoading}
      className={cn(
        "inline-flex w-full items-center justify-center rounded-lg border border-[var(--color-border-soft)] bg-white/5 px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] shadow-sm transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-elevated)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {isLoading ? "Redirecting..." : "Sign in with Microsoft"}
    </button>
  )
}
