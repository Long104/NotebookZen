import { verifyToken } from "../lib/jwt.js"

/**
 * Hono middleware that requires a valid Clerk session token.
 * On success, sets `c.get("userId")` to the Clerk user ID.
 *
 * JWT verification uses the Web Crypto API (crypto.subtle) — zero dependencies,
 * zero module-loading CPU cost. This replaced @clerk/backend (~50KB) to keep
 * the Worker's cold start under Cloudflare's free plan 10ms CPU limit.
 */
export async function requireAuth(c, next) {
  const authHeader = c.req.header("Authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "No token provided" }, 401)
  }

  const token = authHeader.split(" ")[1]

  try {
    const payload = await verifyToken(token)

    if (!payload.sub) {
      return c.json({ error: "Invalid token: no user ID" }, 401)
    }

    c.set("userId", payload.sub)
    await next()
  } catch (error) {
    console.error("Auth error:", error?.message || error)
    return c.json({ error: "Unauthorized" }, 401)
  }
}
