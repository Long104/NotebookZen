import { Hono } from "hono";
import { getDb } from "../../db/db.js";
import { requireAuth } from "../middleware/auth.js";
import { getUserId } from "../lib/db.js";

const app = new Hono();

// Mask a value for display — show first 6 chars + "***" + last 4 chars
function maskValue(value) {
  if (!value || value.length <= 12) return value ? "***" : "";
  return value.slice(0, 6) + "***" + value.slice(-4);
}

// Generate simple unique ID
function genId() {
  return "cfg_" + Math.random().toString(36).slice(2, 10);
}

// ─── GET /api/settings — return configs + active ID ───────────────────────

app.get("/", requireAuth, async (c) => {
  try {
    const ctx = await getDb(c.env.DATABASE_URL);
    const { db, eq, settings: settingsTable } = ctx;
    const userId = await getUserId(ctx, c.get("userId"));

    if (!userId) {
      return c.json({ error: "User not found" }, 404);
    }

    const rows = await db
      .select({ key: settingsTable.key, value: settingsTable.value })
      .from(settingsTable)
      .where(eq(settingsTable.userId, userId));

    const map = {};
    for (const row of rows) map[row.key] = row.value;

    // ── New format: multi-config ──
    if (map.ai_configs) {
      try {
        const configs = JSON.parse(map.ai_configs);
        const activeId = map.ai_active_config_id || configs[0]?.id;

        // Mask API keys for display
        const safeConfigs = configs.map((cfg) => ({
          ...cfg,
          apiKey: cfg.apiKey ? maskValue(cfg.apiKey) : "",
          apiKeySet: !!cfg.apiKey,
        }));

        return c.json({
          configs: safeConfigs,
          activeConfigId: activeId,
        });
      } catch (e) {
        console.error("Failed to parse ai_configs:", e?.message);
      }
    }

    // ── Legacy format: migrate to multi-config on the fly ──
    const legacyConfigs = [];
    if (map.openrouter_api_key) {
      legacyConfigs.push({
        id: genId(),
        name: "OpenRouter",
        provider: "openrouter",
        model: map.openrouter_model || "meta-llama/llama-3.3-70b-instruct:free",
        apiKey: maskValue(map.openrouter_api_key),
        apiKeySet: true,
      });
    }
    if (map.google_api_key) {
      legacyConfigs.push({
        id: genId(),
        name: "Google AI",
        provider: "google",
        model: map.google_model || "gemini-2.0-flash",
        apiKey: maskValue(map.google_api_key),
        apiKeySet: true,
      });
    }

    return c.json({
      configs: legacyConfigs,
      activeConfigId: legacyConfigs[0]?.id || null,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return c.json({ error: "Failed to fetch settings" }, 500);
  }
});

// ─── POST /api/settings — save configs + set active ───────────────────────
// Body: { configs: [...], activeConfigId: "..." }
// Each config: { id, name, provider, model, apiKey }
// apiKey is only updated if provided (not masked)

app.post("/", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { configs, activeConfigId } = body;

    if (!Array.isArray(configs)) {
      return c.json({ error: "configs array is required" }, 400);
    }

    const ctx = await getDb(c.env.DATABASE_URL);
    const { db, eq, settings: settingsTable } = ctx;
    const userId = await getUserId(ctx, c.get("userId"));

    if (!userId) {
      return c.json({ error: "User not found" }, 404);
    }

    // Load existing configs (to preserve API keys when masked value is sent back)
    const existingRows = await db
      .select({ key: settingsTable.key, value: settingsTable.value })
      .from(settingsTable)
      .where(eq(settingsTable.userId, userId));

    const existingMap = {};
    for (const row of existingRows) existingMap[row.key] = row.value;

    let existingConfigs = [];
    if (existingMap.ai_configs) {
      try {
        existingConfigs = JSON.parse(existingMap.ai_configs);
      } catch (e) {
        // ignore parse errors
      }
    }

    // Also check legacy format for API keys
    if (existingConfigs.length === 0) {
      if (existingMap.openrouter_api_key) {
        existingConfigs.push({
          id: "legacy_or",
          name: "OpenRouter",
          provider: "openrouter",
          model: existingMap.openrouter_model || "meta-llama/llama-3.3-70b-instruct:free",
          apiKey: existingMap.openrouter_api_key,
        });
      }
      if (existingMap.google_api_key) {
        existingConfigs.push({
          id: "legacy_google",
          name: "Google AI",
          provider: "google",
          model: existingMap.google_model || "gemini-2.0-flash",
          apiKey: existingMap.google_api_key,
        });
      }
    }

    // Merge: preserve existing API keys if the incoming one is masked or empty
    const mergedConfigs = configs.map((cfg) => {
      const existing = existingConfigs.find((e) => e.id === cfg.id);

      // If incoming apiKey is masked (contains ***) or empty, keep existing
      let apiKey = cfg.apiKey;
      if ((!apiKey || apiKey.includes("***")) && existing) {
        apiKey = existing.apiKey;
      }

      return {
        id: cfg.id || genId(),
        name: cfg.name || `${cfg.provider} ${cfg.model}`,
        provider: cfg.provider,
        model: cfg.model,
        apiKey: apiKey || "",
      };
    });

    // Save as JSON
    const configsJson = JSON.stringify(mergedConfigs);

    // Upsert ai_configs
    await db
      .insert(settingsTable)
      .values({ userId, key: "ai_configs", value: configsJson })
      .onConflictDoUpdate({
        target: [settingsTable.userId, settingsTable.key],
        set: { value: configsJson },
      });

    // Upsert active config ID
    if (activeConfigId) {
      await db
        .insert(settingsTable)
        .values({
          userId,
          key: "ai_active_config_id",
          value: activeConfigId,
        })
        .onConflictDoUpdate({
          target: [settingsTable.userId, settingsTable.key],
          set: { value: activeConfigId },
        });
    }

    return c.json({ message: "Settings saved successfully" });
  } catch (error) {
    console.error("Save settings error:", error);
    return c.json({ error: "Failed to save settings" }, 500);
  }
});

export default app;
