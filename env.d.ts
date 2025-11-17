declare module "@/env.mjs" {
  export const env: {
    NEXT_PUBLIC_SUPABASE_URL: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    NEXT_PUBLIC_VERCEL_URL: string
    NEXT_PUBLIC_SITE_URL?: string
    ANALYZE?: boolean
    SUPABASE_DB_URL: string
  }
}
