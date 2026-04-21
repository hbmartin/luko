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

const preHydrationThemeScript = `
(() => {
  try {
    const storage = globalThis.localStorage;
    const storedTheme = storage.getItem("theme");
    const prefersDark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : prefersDark ? "dark" : "light";
    const storedDensity = storage.getItem("density");
    const density = storedDensity === "compact" || storedDensity === "comfortable" ? storedDensity : "comfortable";
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.density = density;
    root.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.density = "comfortable";
  }
})();
`

const preHydrationThemeScriptMarkup = { __html: preHydrationThemeScript }

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="en" className={lexend.className} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f8fafc" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f172a" />
        <script dangerouslySetInnerHTML={preHydrationThemeScriptMarkup} />
      </head>
      <body>
        <SupabaseProvider session={session}>
          <SupabaseListener />
          {children}
        </SupabaseProvider>
      </body>
    </html>
  )
}
