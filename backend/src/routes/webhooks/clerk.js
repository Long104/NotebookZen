import { Hono } from "hono"
import { getSupabase } from "../../../supabaseClient.js"
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

    const evt = verifyWebhookSignature(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    })

    const eventType = evt.type
    const data = evt.data

    console.log(`Received webhook: ${eventType}`)

    const supabase = getSupabase()

    switch (eventType) {
      case "user.created":
        await handleUserCreated(supabase, data)
        break
      case "user.updated":
        await handleUserUpdated(supabase, data)
        break
      case "user.deleted":
        await handleUserDeleted(supabase, data)
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

async function handleUserCreated(supabase, data) {
  const { id, username, email_addresses, primary_email_address_id } = data

  const primaryEmail = email_addresses.find(
    (email) => email.id === primary_email_address_id,
  )
  const emailAddress = primaryEmail
    ? primaryEmail.email_address
    : email_addresses[0].email_address

  const sanitizedUsername = sanitizeUsername(username, emailAddress)

  const { data: user, error } = await supabase
    .from('"User"')
    .upsert(
      {
        clerkId: id,
        username: sanitizedUsername,
        email: emailAddress,
      },
      { onConflict: '"clerkId"' },
    )
    .select()
    .single()

  if (error) {
    console.error("User upsert error:", error)
    return
  }

  console.log("User upserted:", user)
  return user
}

async function handleUserUpdated(supabase, data) {
  const { id, username, email_addresses, primary_email_address_id } = data

  const primaryEmail = email_addresses.find(
    (email) => email.id === primary_email_address_id,
  )
  const emailAddress = primaryEmail
    ? primaryEmail.email_address
    : email_addresses[0].email_address

  const sanitizedUsername = sanitizeUsername(username, emailAddress)

  const { data: user, error } = await supabase
    .from('"User"')
    .upsert(
      {
        clerkId: id,
        username: sanitizedUsername,
        email: emailAddress,
      },
      { onConflict: '"clerkId"' },
    )
    .select()
    .single()

  if (error) {
    console.error("User upsert error:", error)
    return
  }

  console.log("User upserted:", user)
  return user
}

async function handleUserDeleted(supabase, data) {
  const { id } = data

  const { error } = await supabase
    .from('"User"')
    .delete()
    .eq('"clerkId"', id)

  if (error) {
    console.error("User delete error:", error)
    return
  }

  console.log("User deleted from DB")
}

export default app
