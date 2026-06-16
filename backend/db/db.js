/**
 * Lazy-loaded database context.
 *
 * ALL database-related modules (pg, drizzle-orm, schema) are imported
 * dynamically on first call — NONE load at Worker cold start module scope.
 *
 * Returns a context object with everything handlers need:
 *   { db, pool, eq, desc, sql, inArray, and, users, notes, noteLinks, settings }
 *
 * This keeps the Worker's module scope to just hono + cors (~2ms CPU),
 * leaving ~8ms of the free plan's 10ms budget for the actual request.
 */

let cache = null

export async function getDb(hyperdrive) {
  if (cache) return cache

  // Load ALL heavy modules in parallel — deferred from cold start
  const [{ Pool }, { drizzle }, drizzleUtils, schema] = await Promise.all([
    import("pg"),
    import("drizzle-orm/node-postgres"),
    import("drizzle-orm"),
    import("./schema.js"),
  ])

  const pool = new Pool({ connectionString: hyperdrive.connectionString })
  const db = drizzle(pool, { schema })

  cache = {
    db,
    pool,
    // Drizzle query utilities
    eq: drizzleUtils.eq,
    desc: drizzleUtils.desc,
    sql: drizzleUtils.sql,
    inArray: drizzleUtils.inArray,
    and: drizzleUtils.and,
    // Schema table objects
    users: schema.users,
    notes: schema.notes,
    noteLinks: schema.noteLinks,
    settings: schema.settings,
  }

  return cache
}
