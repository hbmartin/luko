import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

config()
config({ path: ".env.local", override: true })

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not defined. Add it to your .env.local file.")
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.SUPABASE_DB_URL,
  },
  schemaFilter: ["public"],
  tablesFilter: [
    "organizations",
    "profiles",
    "organization_members",
    "notebooks",
    "notebook_categories",
    "notebook_metrics",
    "notebook_formulas",
    "notebook_collaborators",
    "notebook_invites",
    "notebook_branches",
    "branch_snapshots",
    "changes_log",
    "simulations",
  ],
})
