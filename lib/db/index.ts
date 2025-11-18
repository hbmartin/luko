"use server"

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { env } from "@/env.mjs"

import * as schema from "./schema"

type Database = NodePgDatabase<typeof schema>

const globalForDatabase = globalThis as typeof globalThis & {
  pgPool?: Pool
  drizzleDb?: Database
}

const shouldUseSSL = !env.SUPABASE_DB_URL.includes("localhost") && !env.SUPABASE_DB_URL.includes("127.0.0.1")

const pool =
  globalForDatabase.pgPool ??
  new Pool({
    connectionString: env.SUPABASE_DB_URL,
    ssl: shouldUseSSL ? true : undefined,
  })

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.pgPool = pool
}

const database =
  globalForDatabase.drizzleDb ??
  drizzle(pool, {
    schema,
    logger: process.env.NODE_ENV === "development",
  })

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.drizzleDb = database
}

export { database as db, pool }
export type { Database }

export * as schema from "./schema"
