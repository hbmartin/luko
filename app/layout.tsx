import "@/styles/tailwind.css"
import "react-data-grid/lib/styles.css"
import { Lexend } from "next/font/google"
import type { ReactNode } from "react"

import { SupabaseListener } from "@/components/supabase/SupabaseListener"
import { SupabaseProvider } from "@/components/supabase/SupabaseProvider"
import { getSessionFromHeaders } from "@/lib/supabase/session"

const lexend = Lexend({
  subsets: ["latin"],
})

export default function RootLayout({ children }: { children: ReactNode }) {
  const session = getSessionFromHeaders()

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
