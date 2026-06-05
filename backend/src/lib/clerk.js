import { createClerkClient } from "@clerk/backend"
import { Webhook } from "svix"

// Clerk client reads CLERK_SECRET_KEY from process.env by default.
// process.env is populated by the env-injection middleware in worker.js.
export const clerk = createClerkClient()

/**
 * Verify a Clerk webhook payload using the svix Webhook class.
 * The payload must be a raw Buffer (not a parsed JSON object).
 */
export function verifyWebhookSignature(payload, svixHeaders) {
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
