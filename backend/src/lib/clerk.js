/**
 * Verify a Clerk webhook payload using the svix Webhook class.
 * The payload must be a raw Buffer (not a parsed JSON object).
 *
 * Lazy-imports svix — heavy module, not loaded at module scope.
 * @clerk/backend is no longer used anywhere in this project.
 */
export async function verifyWebhookSignature(payload, svixHeaders) {
  const { Webhook } = await import("svix")
  const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)
  return webhook.verify(payload, svixHeaders)
}

/**
 * Derive a safe display name, falling back to email prefix + random suffix.
 */
export function sanitizeUsername(username, email) {
  if (username && username.trim()) return username.trim()
  const base = email.split("@")[0]
  return base + "_" + Math.floor(Math.random() * 10000)
}
