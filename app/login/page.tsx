import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { MagicLinkForm } from "@/components/auth/MagicLinkForm"
import { getSessionFromHeaders } from "@/lib/supabase/session"

export const metadata: Metadata = {
  title: "Sign in",
}

type LoginPageProperties = {
  searchParams?: {
    error?: string
  }
}

export default function LoginPage({ searchParams }: LoginPageProperties) {
  const session = getSessionFromHeaders()

  if (session) {
    redirect("/")
  }

  const errorMessage = typeof searchParams?.error === "string" ? searchParams.error : undefined

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-8 shadow-xl">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Welcome back</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Sign in with email or Microsoft SSO.</p>
        </div>
        {errorMessage && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        <div className="mt-8">
          <MagicLinkForm />
        </div>
      </div>
    </div>
  )
}
