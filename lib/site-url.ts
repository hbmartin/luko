import { env } from "@/env.mjs"

function resolveSiteUrl() {
  const configured = env.NEXT_PUBLIC_SITE_URL ?? env.NEXT_PUBLIC_VERCEL_URL
  const vercelHost = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL
  const fallback = configured ?? (vercelHost ? `https://${vercelHost}` : undefined)

  if (!fallback) {
    throw new Error(
      "Site URL is not configured. Set NEXT_PUBLIC_VERCEL_URL in .env.local or rely on Vercel's NEXT_PUBLIC_VERCEL_URL."
    )
  }

  return fallback.replace(/\/$/, "")
}

export const siteUrl = resolveSiteUrl()
