/**
 * Lazy-loaded database context.
 *
 * ALL database-related modules (pg, drizzle-orm, schema) are imported
 * dynamically on first call — NONE load at Worker cold start module scope.
 *
 * Returns a context object with everything handlers need:
 *   { db, pool, eq, desc, sql, inArray, and, users, notes, noteLinks, settings }
 *
 * Pool configuration tuned to prevent Worker hangs:
 *   - connectionTimeoutMillis: fail fast (3s) instead of hanging forever
 *     when Hyperdrive/Supabase pool is exhausted. Hono's error handler
 *     catches the timeout → returns 500 WITH CORS headers → browser can
 *     read the error → fetchWithRetry can retry.
 *   - idleTimeoutMillis: aggressively close idle connections to free pool.
 *   - max: keep pool small (3) to avoid overwhelming upstream.
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

  const pool = new Pool({
    connectionString: hyperdrive.connectionString,
    // Fail fast instead of hanging — prevents Cloudflare "Worker hung" kills
    connectionTimeoutMillis: 3000,
    // Aggressively reclaim idle connections
    idleTimeoutMillis: 5000,
    // Small pool — Hyperdrive manages upstream, we just need local sockets
    max: 3,
  })

  // If the pool errors (e.g., connection dies), clear the cache so the
  // next request creates a fresh pool instead of reusing a broken one.
  pool.on("error", (err) => {
    console.error("PG pool error:", err?.message)
    cache = null
  })

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
