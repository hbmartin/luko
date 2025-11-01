"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"

import { useSupabase } from "@/components/supabase/SupabaseProvider"

export function LoginForm() {
  const router = useRouter()
  const { supabase } = useSupabase()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const email = formData.get("email")
    const password = formData.get("password")

    if (typeof email !== "string" || typeof password !== "string") {
      setErrorMessage("Invalid form submission.")
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    router.replace("/")
    router.refresh()
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="focus-visible:ring-primary/40 block w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] shadow-sm transition outline-none focus-visible:ring-2"
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <label
          className="text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase"
          htmlFor="password"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="focus-visible:ring-primary/40 block w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] shadow-sm transition outline-none focus-visible:ring-2"
          placeholder="••••••••"
        />
      </div>

      {errorMessage ? <p className="text-sm text-[var(--color-danger)]">{errorMessage}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-elevated)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  )
}
