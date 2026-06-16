import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "./schema.js"

/**
 * Returns a singleton Drizzle ORM client backed by a single pg.Pool.
 *
 * In Cloudflare Workers, module-level state lives as long as the isolate.
 * Hyperdrive connection strings are stable, so the Pool can be created
 * once and reused across requests. This avoids leaking TCP connections
 * (which would exhaust the Postgres connection limit).
 */
let pool = null

export function getDb(hyperdrive) {
  if (!pool) {
    pool = new Pool({ connectionString: hyperdrive.connectionString })
  }
  return drizzle(pool, { schema })
}
