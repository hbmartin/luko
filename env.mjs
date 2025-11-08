import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

const optionalNormalizedUrl = z
  .preprocess((value) => {
    if (typeof value !== "string" || value.length === 0) {
      return undefined
    }

    return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`
  }, z.string().url())
  .optional()

export const env = createEnv({
  server: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_VERCEL_URL: optionalNormalizedUrl,
    ANALYZE: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_VERCEL_URL: optionalNormalizedUrl,
  },
  runtimeEnv: {
    ANALYZE: process.env.ANALYZE,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
  },
})
