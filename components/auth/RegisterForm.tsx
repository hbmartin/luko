"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"

import { MicrosoftSignInButton } from "@/components/auth/MicrosoftSignInButton"
import { useSupabase } from "@/components/supabase/SupabaseProvider"

export function RegisterForm() {
  const router = useRouter()
  const { supabase } = useSupabase()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
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
    setSuccessMessage(null)

    const redirectTo = `${window.location.origin}/auth/callback`

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    if (data.session) {
      router.replace("/")
      return
    }

    setSuccessMessage("Check your inbox to confirm your email before signing in.")
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <MicrosoftSignInButton onErrorChange={setErrorMessage} />

      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
        <span className="h-px flex-1 bg-[var(--color-border-soft)]" />
        <span>Or continue with email</span>
        <span className="h-px flex-1 bg-[var(--color-border-soft)]" />
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            className="text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase"
            htmlFor="email"
          >
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
            minLength={8}
            autoComplete="new-password"
            className="focus-visible:ring-primary/40 block w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] shadow-sm transition outline-none focus-visible:ring-2"
            placeholder="Create a strong password"
          />
        </div>

        {errorMessage ? <p className="text-sm text-[var(--color-danger)]">{errorMessage}</p> : null}
        {successMessage ? <p className="text-sm text-[var(--color-success)]">{successMessage}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-elevated)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </div>
  )
}
