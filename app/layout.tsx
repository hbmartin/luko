import "styles/tailwind.css"
import "react-data-grid/lib/styles.css"
import { Lexend } from "next/font/google"

const lexend = Lexend({
  subsets: ["latin"],
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lexend.className}>
      <body>{children}</body>
    </html>
  )
}
