"use client"

import { useRouter } from "next/navigation"

import { CredentialsForm } from "@/components/auth/CredentialsForm"
import { useSupabase } from "@/components/supabase/SupabaseProvider"
import { AUTH_CALLBACK_URL } from "@/lib/auth"

type MagicLinkFormProperties = {
  submitLabel?: string
  submittingLabel?: string
}

export function MagicLinkForm({ submitLabel = "Sign in", submittingLabel = "Signing in..." }: MagicLinkFormProperties) {
  const router = useRouter()
  const { supabase } = useSupabase()

  const handleCredentials = async ({ email }: { email: string }) => {
    console.log("handleCredentials", AUTH_CALLBACK_URL)
    const { error, data } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: AUTH_CALLBACK_URL },
    })

    if (error) {
      return { errorMessage: error.message }
    }

    if (data.session) {
      router.replace("/")
      return
    }

    return {
      successMessage: "Check your inbox to confirm your email before signing in.",
    }
  }

  return <CredentialsForm submitLabel={submitLabel} submittingLabel={submittingLabel} onSubmit={handleCredentials} />
}
