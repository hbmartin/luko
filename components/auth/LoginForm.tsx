"use client"

import { useRouter } from "next/navigation"

import { CredentialsForm } from "@/components/auth/CredentialsForm"
import { useSupabase } from "@/components/supabase/SupabaseProvider"
import { AUTH_CALLBACK_URL } from "@/lib/auth"

export function LoginForm() {
  const router = useRouter()
  const { supabase } = useSupabase()

  const handleCredentials = async ({ email }: { email: string }) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: AUTH_CALLBACK_URL },
    })

    if (error) {
      return { errorMessage: error.message }
    }

    router.replace("/")
  }

  return <CredentialsForm submitLabel="Sign in" submittingLabel="Signing in..." onSubmit={handleCredentials} />
}
