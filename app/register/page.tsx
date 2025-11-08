import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { RegisterForm } from "@/components/auth/RegisterForm"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Create account",
}

export default async function RegisterPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-8 shadow-xl">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Create your account</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Get started with email or Microsoft single sign-on.</p>
        </div>

        <div className="mt-8">
          <RegisterForm />
        </div>

        <p className="mt-8 text-center text-sm text-[var(--color-text-muted)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--color-text-primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
