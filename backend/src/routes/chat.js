import { Hono } from "hono";
import { getDb } from "../../db/db.js";
import { requireAuth } from "../middleware/auth.js";
import { getUserId } from "../lib/db.js";
import { hybridRetrieve, fallbackRetrieve } from "../lib/retrieval.js";

const app = new Hono();

// ─── System prompt — natural conversational tone ──────────────────────────
const SYSTEM_PROMPT = `You are a friendly AI assistant for NotebookZen, a note-taking app. You help the user understand and find things in their notes.

You're having a normal conversation. Be natural, helpful, and concise.

When answering:
- Use the notes below as your knowledge base
- Answer like you're chatting — no formal citations or rigid formatting
- If something comes from a specific note, just mention it naturally (e.g., "In your 'React Hooks' note, you mentioned...")
- If the notes don't have the answer, just say so honestly
- Don't make things up

USER'S NOTES:
{notes}`;

// ─── Fetch active AI config from DB (multi-config support) ─────────────────

async function getActiveConfig(ctx, userId) {
  const { db, eq, settings: settingsTable } = ctx;
  const rows = await db
    .select({ key: settingsTable.key, value: settingsTable.value })
    .from(settingsTable)
    .where(eq(settingsTable.userId, userId));

  const map = {};
  for (const row of rows) map[row.key] = row.value;

  // ── New format: multi-config presets stored as JSON ──
  if (map.ai_configs) {
    try {
      const configs = JSON.parse(map.ai_configs);
      const activeId = map.ai_active_config_id;
      const active = configs.find((c) => c.id === activeId) || configs[0];
      if (active && active.apiKey) {
        return {
          provider: active.provider,
          apiKey: active.apiKey,
          model: active.model,
        };
      }
    } catch (e) {
      console.error("Failed to parse ai_configs:", e?.message);
    }
  }

  // ── Legacy format: single config ──
  const provider = map.ai_provider || "openrouter";
  if (provider === "google" && map.google_api_key) {
    return {
      provider: "google",
      apiKey: map.google_api_key,
      model: map.google_model || "gemini-2.0-flash",
    };
  }
  if (map.openrouter_api_key) {
    return {
      provider: "openrouter",
      apiKey: map.openrouter_api_key,
      model: map.openrouter_model || "meta-llama/llama-3.3-70b-instruct:free",
    };
  }

  return null;
}

// ─── Create model from active config ──────────────────────────────────────

async function createModel(config) {
  switch (config.provider) {
    case "google": {
      if (!config.apiKey) {
        throw new Error("Google API key not configured. Please set it in Settings.");
      }
      const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
      return new ChatGoogleGenerativeAI({
        model: config.model,
        apiKey: config.apiKey,
        temperature: 0.4,
        maxOutputTokens: 1024,
      });
    }
    case "openrouter":
    default: {
      if (!config.apiKey) {
        throw new Error("OpenRouter API key not configured. Please set it in Settings.");
      }
      const { ChatOpenAI } = await import("@langchain/openai");
      return new ChatOpenAI({
        model: config.model,
        apiKey: config.apiKey,
        temperature: 0.4,
        maxTokens: 1024,
        configuration: {
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
            "X-Title": "NotebookZen",
          },
        },
      });
    }
  }
}

// ─── POST /api/chat ───────────────────────────────────────────────────────

app.post("/chat", requireAuth, async (c) => {
  try {
    const { question } = await c.req.json();

    if (!question || !question.trim()) {
      return c.json({ error: "Question is required" }, 400);
    }

    const ctx = await getDb(c.env.DATABASE_URL);
    const userId = await getUserId(ctx, c.get("userId"));

    if (!userId) {
      return c.json({ error: "User not found" }, 404);
    }

    // ── Load active AI config ──
    const config = await getActiveConfig(ctx, userId);
    if (!config) {
      return c.json(
        {
          error: "No AI configuration set up. Go to Settings to add a provider and API key.",
        },
        422,
      );
    }

    // ── Hybrid retrieval — tighter, relevant sources only ──
    let contextNotes;
    let retrievalMode;

    const hybrid = await hybridRetrieve(ctx, c.env.AI, question, userId, {
      topK: 3, // fewer top results (was 5)
      maxContext: 6, // less expansion (was 15)
    });

    if (hybrid.source === "hybrid" && hybrid.notes.length > 0) {
      contextNotes = hybrid.notes;
      retrievalMode = "hybrid";
    } else {
      const fallback = await fallbackRetrieve(ctx, userId);
      contextNotes = fallback.notes;
      retrievalMode = "fallback";
    }

    if (contextNotes.length === 0) {
      return c.json({
        answer:
          "You don't have any notes yet. Create some notes and I'll be able to help you find information in them!",
        sources: [],
      });
    }

    // ── Format notes into prompt ──
    const formattedNotes = contextNotes
      .map((note) => {
        const content = (note.content || "(empty note)").slice(0, 500);
        return `[${note.title}]\n${content}`;
      })
      .join("\n\n---\n\n");

    // ── Create model + invoke ──
    const model = await createModel(config);

    const prompt = SYSTEM_PROMPT.replace("{notes}", formattedNotes).replace("{question}", question);

    const response = await model.invoke([
      { role: "system", content: "You are a helpful, friendly assistant." },
      { role: "user", content: prompt },
    ]);

    // ── Return only the notes that were actually used (topK vector matches) ──
    const sources = contextNotes.slice(0, 3).map((note) => ({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
    }));

    return c.json({
      answer: response.content,
      sources,
      retrieval: retrievalMode,
    });
  } catch (error) {
    console.error("Chat error:", error?.message || error);

    const errStr = error?.message || String(error);

    // Config errors
    if (errStr.includes("not configured") || errStr.includes("No AI configuration")) {
      return c.json({ error: errStr }, 422);
    }

    // 402 — free model quota exhausted
    if (
      errStr.includes("402") ||
      errStr.toLowerCase().includes("payment required") ||
      errStr.toLowerCase().includes("provider returned error")
    ) {
      return c.json(
        {
          error:
            "Free model quota exhausted for today. Switch to a different model in Settings or wait until midnight UTC for reset.",
        },
        402,
      );
    }

    // 429 — rate limited
    if (errStr.includes("429") || errStr.toLowerCase().includes("rate")) {
      return c.json(
        {
          error: "Rate limit hit. Try a different model in Settings or wait a moment.",
        },
        429,
      );
    }

    // 404 — model not found
    if (
      errStr.includes("404") ||
      errStr.toLowerCase().includes("not found") ||
      errStr.toLowerCase().includes("does not exist")
    ) {
      return c.json(
        {
          error: "Model not found — it may have been removed. Update it in Settings.",
        },
        422,
      );
    }

    // 401 — invalid key
    if (
      errStr.includes("401") ||
      errStr.toLowerCase().includes("unauthorized") ||
      errStr.toLowerCase().includes("invalid api key")
    ) {
      return c.json({ error: "Invalid API key. Check your key in Settings." }, 422);
    }

    // Surface the actual error
    return c.json({ error: errStr.slice(0, 300) }, 500);
  }
});

export default app;
