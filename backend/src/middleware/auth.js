/**
 * Hono middleware that requires a valid Clerk session token.
 * On success, sets `c.get("userId")` to the Clerk user ID.
 */
export async function requireAuth(c, next) {
  const authHeader = c.req.header("Authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "No token provided" }, 401)
  }

  const token = authHeader.split(" ")[1]

  try {
    // Lazy-import @clerk/backend — this module is heavy (~50KB+) and
    // loading it at module scope adds ~5-10ms CPU time on cold start.
    const { verifyToken } = await import("@clerk/backend")

    const { sub: userId } = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    })

    if (!userId) {
      return c.json({ error: "Invalid token" }, 401)
    }

    c.set("userId", userId)
    await next()
  } catch (error) {
    console.error("Auth error:", error)
    return c.json({ error: "Unauthorized" }, 401)
  }
}
