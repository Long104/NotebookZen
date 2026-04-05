const express = require("express");
const prisma = require("../../../prismaClient");
const { verifyWebhookSignature, sanitizeUsername } = require("../../lib/clerk");

const router = express.Router();

// Clerk webhook endpoint
router.post(
  "/clerk",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      // Get Clerk webhook headers
      const svixId = req.headers["svix-id"];
      const svixTimestamp = req.headers["svix-timestamp"];
      const svixSignature = req.headers["svix-signature"];

      if (!svixId || !svixTimestamp || !svixSignature) {
        return res.status(400).json({ error: "Missing webhook headers" });
      }

      // Verify webhook signature
      const evt = verifyWebhookSignature(req.body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });

      const eventType = evt.type;
      const data = evt.data;

      console.log(`Received webhook: ${eventType}`);

      switch (eventType) {
        case "user.created":
          await handleUserCreated(data);
          break;
        case "user.updated":
          await handleUserUpdated(data);
          break;
        case "user.deleted":
          await handleUserDeleted(data);
          break;
        default:
          console.log(`Unhandled event type: ${eventType}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: error.message });
    }
  },
);

// Handle user creation (idempotent with upsert)
async function handleUserCreated(data) {
  const { id, username, email_addresses, primary_email_address_id } = data;

  const primaryEmail = email_addresses.find(
    (email) => email.id === primary_email_address_id,
  );
  const emailAddress = primaryEmail
    ? primaryEmail.email_address
    : email_addresses[0].email_address;

  const sanitizedUsername = sanitizeUsername(username, emailAddress);

  const user = await prisma.user.upsert({
    where: { clerkId: id },
    update: {
      username: sanitizedUsername,
      email: emailAddress,
    },
    create: {
      clerkId: id,
      username: sanitizedUsername,
      email: emailAddress,
    },
  });

  console.log("User upserted in Prisma:", user);
  return user;
}

// Handle user update (idempotent with upsert)
async function handleUserUpdated(data) {
  const { id, username, email_addresses, primary_email_address_id } = data;

  const primaryEmail = email_addresses.find(
    (email) => email.id === primary_email_address_id,
  );
  const emailAddress = primaryEmail
    ? primaryEmail.email_address
    : email_addresses[0].email_address;

  const sanitizedUsername = sanitizeUsername(username, emailAddress);

  const user = await prisma.user.upsert({
    where: { clerkId: id },
    update: {
      username: sanitizedUsername,
      email: emailAddress,
    },
    create: {
      clerkId: id,
      username: sanitizedUsername,
      email: emailAddress,
    },
  });

  console.log("User upserted in Prisma:", user);
  return user;
}

// Handle user deletion (safe with deleteMany)
async function handleUserDeleted(data) {
  const { id } = data;

  const result = await prisma.user.deleteMany({
    where: { clerkId: id },
  });

  console.log("User deleted from Prisma, count:", result.count);
  return result;
}

module.exports = router;
