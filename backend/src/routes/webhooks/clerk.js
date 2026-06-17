import { Hono } from "hono"
import { getDb } from "../../../db/db.js"
import { verifyWebhookSignature, sanitizeUsername } from "../../lib/clerk.js"

const app = new Hono()

// ─── POST /api/webhooks/clerk ──────────────────────────────────────────────

app.post("/clerk", async (c) => {
  try {
    const svixId = c.req.header("svix-id")
    const svixTimestamp = c.req.header("svix-timestamp")
    const svixSignature = c.req.header("svix-signature")

    if (!svixId || !svixTimestamp || !svixSignature) {
      return c.json({ error: "Missing webhook headers" }, 400)
    }

    // Read raw body as Buffer for signature verification
    const rawBody = await c.req.arrayBuffer()
    const payload = Buffer.from(rawBody)

    const evt = await verifyWebhookSignature(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    })

    const eventType = evt.type
    const data = evt.data

    console.log(`Received webhook: ${eventType}`)

    const ctx = await getDb(c.env.DATABASE_URL)

    switch (eventType) {
      case "user.created":
      case "user.updated":
        await upsertUser(ctx, data)
        break
      case "user.deleted":
        await handleUserDeleted(ctx, data)
        break
      default:
        console.log(`Unhandled event type: ${eventType}`)
    }

    return c.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return c.json({ error: error.message }, 400)
  }
})

// ─── Helpers ───────────────────────────────────────────────────────────────

async function upsertUser(ctx, data) {
  const { db, users } = ctx
  const { id, username, email_addresses, primary_email_address_id } = data

  const primaryEmail = email_addresses.find(
    (email) => email.id === primary_email_address_id,
  )
  const emailAddress = primaryEmail
    ? primaryEmail.email_address
    : email_addresses[0].email_address

  const sanitizedUsername = sanitizeUsername(username, emailAddress)

  const [user] = await db
    .insert(users)
    .values({
      clerkId: id,
      username: sanitizedUsername,
      email: emailAddress,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: { username: sanitizedUsername, email: emailAddress },
    })
    .returning()

  console.log("User upserted:", user)
  return user
}

async function handleUserDeleted(ctx, data) {
  const { db, eq, users } = ctx
  const { id } = data

  await db.delete(users).where(eq(users.clerkId, id))

  console.log("User deleted from DB")
}

export default app
