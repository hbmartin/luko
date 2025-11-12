import { env } from "@/env.mjs"

function resolveSiteUrl() {
  const siteUrl =
    env.NEXT_PUBLIC_SITE_URL ??
    env.NEXT_PUBLIC_VERCEL_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)

  if (!siteUrl) {
    throw new Error(
      "Site URL is not configured. Set NEXT_PUBLIC_VERCEL_URL in .env.local or rely on Vercel's NEXT_PUBLIC_VERCEL_URL."
    )
  }

  return siteUrl.replace(/\/$/, "")
}

export const siteUrl = resolveSiteUrl()
