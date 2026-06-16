/**
 * Returns a singleton Drizzle ORM client backed by a single pg.Pool.
 *
 * In Cloudflare Workers, module-level state lives as long as the isolate.
 * Hyperdrive connection strings are stable, so the Pool can be created
 * once and reused across requests. This avoids leaking TCP connections
 * (which would exhaust the Postgres connection limit).
 *
 * IMPORTANT: pg + drizzle-orm/node-postgres are lazy-imported on first call
 * so they are NOT loaded during Worker cold start. This keeps CPU time
 * under the free plan's 10ms limit for note CRUD operations.
 */

let pool = null
let db = null
let schema = null

export async function getDb(hyperdrive) {
  if (db) return db

  // Lazy-import heavy modules — not loaded on cold start
  const [{ Pool }, { drizzle }] = await Promise.all([
    import("pg"),
    import("drizzle-orm/node-postgres"),
  ])

  if (!schema) {
    schema = await import("./schema.js")
  }

  pool = new Pool({ connectionString: hyperdrive.connectionString })
  db = drizzle(pool, { schema })

  return db
}
