import { Hono } from "hono"
import { getSupabase } from "../../supabaseClient.js"
import { requireAuth } from "../middleware/auth.js"

const app = new Hono()

// AI setting keys that are allowed to be stored
const AI_SETTING_KEYS = [
  "ai_provider",
  "openrouter_api_key",
  "openrouter_model",
  "google_api_key",
  "google_model",
]

// Mask a value for display — show first 6 chars + "***" + last 4 chars
function maskValue(value) {
  if (!value || value.length <= 12) return value ? "***" : ""
  return value.slice(0, 6) + "***" + value.slice(-4)
}

// ─── GET /api/settings ─────────────────────────────────────────────────────

app.get("/", requireAuth, async (c) => {
  try {
    const clerkId = c.get("userId")
    const supabase = getSupabase()

    const { data: user } = await supabase
      .from('"User"')
      .select("id")
      .eq('"clerkId"', clerkId)
      .single()

    if (!user) {
      return c.json({ error: "User not found" }, 404)
    }

    const { data: settings } = await supabase
      .from('"Setting"')
      .select("key, value")
      .eq('"userId"', user.id)
      .in("key", AI_SETTING_KEYS)

    // Build response with defaults for missing keys
    const defaults = {
      ai_provider: "openrouter",
      openrouter_api_key: "",
      openrouter_model: "google/gemini-2.0-flash-exp:free",
      google_api_key: "",
      google_model: "gemini-2.0-flash",
    }

    const result = { ...defaults }
    for (const row of settings || []) {
      // Mask sensitive keys for display
      if (row.key.endsWith("_api_key")) {
        result[row.key] = maskValue(row.value)
        result[row.key + "_set"] = !!row.value // flag: key exists
      } else {
        result[row.key] = row.value
      }
    }

    return c.json(result)
  } catch (error) {
    console.error("Get settings error:", error)
    return c.json({ error: "Failed to fetch settings" }, 500)
  }
})

// ─── POST /api/settings ────────────────────────────────────────────────────
// Body: { settings: { ai_provider: "openrouter", openrouter_api_key: "sk-...", ... } }

app.post("/", requireAuth, async (c) => {
  try {
    const clerkId = c.get("userId")
    const body = await c.req.json()
    const { settings } = body

    if (!settings || typeof settings !== "object") {
      return c.json({ error: "settings object is required" }, 400)
    }

    const supabase = getSupabase()

    const { data: user } = await supabase
      .from('"User"')
      .select("id")
      .eq('"clerkId"', clerkId)
      .single()

    if (!user) {
      return c.json({ error: "User not found" }, 404)
    }

    // Filter to only allowed keys
    const entries = Object.entries(settings).filter(([key]) =>
      AI_SETTING_KEYS.includes(key),
    )

    if (entries.length === 0) {
      return c.json({ error: "No valid settings provided" }, 400)
    }

    // Upsert each setting
    for (const [key, value] of entries) {
      // Skip masked values (user didn't change the key)
      if (typeof value === "string" && value.includes("***")) {
        continue
      }

      const { error } = await supabase
        .from('"Setting"')
        .upsert(
          { userId: user.id, key, value: String(value) },
          { onConflict: '"userId",key' },
        )

      if (error) {
        console.error(`Upsert error for ${key}:`, error)
        return c.json({ error: `Failed to save ${key}` }, 500)
      }
    }

    return c.json({ message: "Settings saved successfully" })
  } catch (error) {
    console.error("Save settings error:", error)
    return c.json({ error: "Failed to save settings" }, 500)
  }
})

export default app
