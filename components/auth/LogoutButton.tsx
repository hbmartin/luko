"use client"

import clsx from "clsx"
import { LogOut } from "lucide-react"
import { useState } from "react"

import { useSupabase } from "@/components/supabase/SupabaseProvider"

type LogoutButtonProps = {
  variant?: "text" | "icon"
  className?: string
}

export function LogoutButton({ variant = "text", className }: LogoutButtonProps) {
  const { supabase } = useSupabase()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("Error signing out:", error.message)
        setIsSigningOut(false)
      }
    } catch (error) {
      setIsSigningOut(false)
      console.error("Error signing out", error)
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className={clsx(
          "inline-flex items-center justify-center rounded-full border border-transparent p-1.5 text-[var(--color-text-muted)] transition hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:outline-none",
          className
        )}
        aria-label="Sign out"
      >
        <LogOut size={16} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={clsx(
        "inline-flex items-center justify-center rounded-lg border border-[var(--color-border-soft)] bg-[color-mix(in_oklch,var(--color-surface-muted)_92%,transparent)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] shadow-sm transition hover:bg-[color-mix(in_oklch,var(--color-surface-muted)_70%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-elevated)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {isSigningOut ? "Signing out..." : "Sign out"}
    </button>
  )
}
