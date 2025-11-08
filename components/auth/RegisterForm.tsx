"use client"

import { useRouter } from "next/navigation"

import { CredentialsForm } from "@/components/auth/CredentialsForm"
import { useSupabase } from "@/components/supabase/SupabaseProvider"
import { siteUrl } from "@/lib/site-url"

export function RegisterForm() {
  const router = useRouter()
  const { supabase } = useSupabase()

  const handleCredentials = async ({ email, password }: { email: string; password: string }) => {
    const redirectTo = `${siteUrl}/auth/callback`

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      return { errorMessage: error.message }
    }

    if (data.session) {
      router.replace("/")
      return
    }

    return { successMessage: "Check your inbox to confirm your email before signing in." }
  }

  return (
    <CredentialsForm
      submitLabel="Create account"
      submittingLabel="Creating account..."
      passwordPlaceholder="Create a strong password"
      passwordAutoComplete="new-password"
      passwordMinLength={8}
      onSubmit={handleCredentials}
    />
  )
}
