import "@/styles/tailwind.css"
import "react-data-grid/lib/styles.css"
import { Lexend } from "next/font/google"
import type { ReactNode } from "react"

import { SupabaseListener } from "@/components/supabase/SupabaseListener"
import { SupabaseProvider } from "@/components/supabase/SupabaseProvider"
import { createServerSupabaseClient } from "@/lib/supabase/server"

const lexend = Lexend({
  subsets: ["latin"],
})

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="en" className={lexend.className}>
      <body>
        <SupabaseProvider session={session}>
          <SupabaseListener />
          {children}
        </SupabaseProvider>
      </body>
    </html>
  )
}
