/**
 * Lazy-loaded database context.
 *
 * ALL database-related modules (@neondatabase/serverless, drizzle-orm, schema)
 * are imported dynamically on first call — NONE load at Worker cold start
 * module scope.
 *
 * Returns a context object with everything handlers need:
 *   { db, eq, desc, sql, inArray, and, users, notes, noteLinks, folders, settings }
 *
 * Uses Neon's serverless HTTP driver (no connection pool):
 *   - Every query is a stateless HTTP request → no pool to exhaust.
 *   - No hanging, no timeouts, no retries needed for pool exhaustion.
 *   - Works seamlessly in background tasks (ctx.waitUntil).
 */

let cache = null;

export async function getDb(databaseUrl) {
  if (cache) return cache;

  // Load ALL heavy modules in parallel — deferred from cold start
  const [{ neon }, { drizzle }, drizzleUtils, schema] = await Promise.all([
    import("@neondatabase/serverless"),
    import("drizzle-orm/neon-http"),
    import("drizzle-orm"),
    import("./schema.js"),
  ]);

  // neon() returns a tagged-template SQL executor — every call is an
  // HTTP request to Neon's proxy. No pool, no connection overhead.
  const neonSql = neon(databaseUrl);
  const db = drizzle(neonSql, { schema });

  cache = {
    db,
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
    folders: schema.folders,
    settings: schema.settings,
  };

  return cache;
}
