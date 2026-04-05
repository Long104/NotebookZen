const { createClerkClient } = require("@clerk/backend");
require("dotenv").config();

// Initialize Clerk client
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Verify Clerk webhook signature
function verifyWebhookSignature(payload, svixHeaders) {
  try {
    const { Webhook } = require("svix");
    const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    const evt = webhook.verify(payload, svixHeaders);
    return evt;
  } catch (error) {
    console.error("Webhook verification failed:", error);
    throw new Error("Invalid webhook signature");
  }
}

function sanitizeUsername(username, email) {
  if (username && username.trim()) {
    return username.trim();
  }
  const base = email.split("@")[0];
  return base + "_" + Math.floor(Math.random() * 10000);
}

module.exports = { clerk, verifyWebhookSignature, sanitizeUsername };
