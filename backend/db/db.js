import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "./schema.js"

/**
 * Creates a fresh Drizzle ORM client per request via Hyperdrive.
 *
 * Workers are stateless — they can't maintain TCP connections
 * between requests. Hyperdrive makes this cheap: the connection
 * from Worker → Hyperdrive is internal (~1ms), and Hyperdrive
 * maintains the persistent pool to Postgres.
 */
export function getDb(hyperdrive) {
  const pool = new Pool({ connectionString: hyperdrive.connectionString })
  return drizzle(pool, { schema })
}
