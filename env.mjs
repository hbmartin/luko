/* eslint-disable unicorn/prevent-abbreviations */
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

const normalizedUrl = z.preprocess((value) => {
  if (typeof value !== "string" || value.length === 0) {
    return
  }

  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`
}, z.string().url())

const postgresUrl = z
  .string()
  .min(1)
  .refine(
    (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
    "SUPABASE_DB_URL must be a valid Postgres connection string."
  )

export const env = createEnv({
  server: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_VERCEL_URL: normalizedUrl,
    NEXT_PUBLIC_SITE_URL: normalizedUrl.optional(),
    ANALYZE: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
    SUPABASE_DB_URL: postgresUrl,
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_VERCEL_URL: normalizedUrl,
    NEXT_PUBLIC_SITE_URL: normalizedUrl.optional(),
  },
  runtimeEnv: {
    ANALYZE: process.env.ANALYZE,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
  },
})
