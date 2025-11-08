"use client"

import { useRouter } from "next/navigation"

import { CredentialsForm } from "@/components/auth/CredentialsForm"
import { useSupabase } from "@/components/supabase/SupabaseProvider"

export function LoginForm() {
  const router = useRouter()
  const { supabase } = useSupabase()

  const handleCredentials = async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { errorMessage: error.message }
    }

    router.replace("/")
  }

  return <CredentialsForm submitLabel="Sign in" submittingLabel="Signing in..." onSubmit={handleCredentials} />
}
