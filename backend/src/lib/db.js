/**
 * DB query helpers built on top of the lazy-loaded `getDb()` context.
 *
 * These consolidate the copy-pasted clerkId → user.id lookup that appeared
 * in every authenticated route handler.
 */

/**
 * Resolve a Clerk user ID (from `c.get("userId")`) to the numeric DB user id.
 *
 * @param {object} ctx - The context object returned by `getDb()`.
 * @param {string} clerkId - The Clerk user ID (JWT `sub`).
 * @returns {Promise<number|null>} The DB user id, or null if no such user.
 */
export async function getUserId(ctx, clerkId) {
  const { db, eq, users } = ctx
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)
  return user?.id ?? null
}
