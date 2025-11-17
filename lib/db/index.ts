"use server"

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { env } from "@/env.mjs"

import * as schema from "./schema"

type Database = NodePgDatabase<typeof schema>

const globalForDb = globalThis as typeof globalThis & {
  pgPool?: Pool
  drizzleDb?: Database
}

const shouldUseSSL = !env.SUPABASE_DB_URL.includes("localhost") && !env.SUPABASE_DB_URL.includes("127.0.0.1")

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: env.SUPABASE_DB_URL,
    ssl: shouldUseSSL ? { rejectUnauthorized: false } : undefined,
  })

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool
}

const db =
  globalForDb.drizzleDb ??
  drizzle(pool, {
    schema,
    logger: process.env.NODE_ENV === "development",
  })

if (process.env.NODE_ENV !== "production") {
  globalForDb.drizzleDb = db
}

export { db, pool, schema }
export type { Database }
