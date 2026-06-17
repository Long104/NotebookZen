import { Hono } from "hono"
import { getDb } from "../../db/db.js"
import { requireAuth } from "../middleware/auth.js"
import { getUserId } from "../lib/db.js"
import { hybridRetrieve, fallbackRetrieve } from "../lib/retrieval.js"

const app = new Hono()

const SYSTEM_PROMPT = `You are a helpful AI assistant for NotebookZen, a note-taking app.
You answer questions based ONLY on the user's notes provided below.

RULES:
- Answer the question using the provided note excerpts.
- ALWAYS cite which note each piece of information comes from using the format: [Source: "Note Title" (ID: X)].
- If multiple notes are relevant, cite all of them.
- If the notes don't contain enough information to answer the question, say so honestly.
- Be concise but thorough.
- Do not make up information that is not in the notes.

RELEVANT NOTES (retrieved via semantic + graph search):
{notes}

QUESTION: {question}

ANSWER:`

// ─── Fetch user AI settings from DB ──────────────────────────────────────

async function getUserAISettings(ctx, userId) {
  const { db, eq, settings: settingsTable } = ctx
  const rows = await db
    .select({ key: settingsTable.key, value: settingsTable.value })
    .from(settingsTable)
    .where(eq(settingsTable.userId, userId))

  const map = {}
  for (const row of rows) {
    map[row.key] = row.value
  }

  return {
    ai_provider: map.ai_provider || "openrouter",
    openrouter_api_key: map.openrouter_api_key || "",
    openrouter_model: map.openrouter_model || "google/gemini-2.0-flash-exp:free",
    google_api_key: map.google_api_key || "",
    google_model: map.google_model || "gemini-2.0-flash",
  }
}

// ─── Create model from per-user settings (BYOK) ──────────────────────────
// Lazy-imports @langchain/* modules — they are very heavy (~200KB+ each)
// and should not be loaded at module scope on cold start.

async function createModel(userSettings) {
  const provider = userSettings.ai_provider

  switch (provider) {
    case "google": {
      if (!userSettings.google_api_key) {
        throw new Error("Google API key not configured. Please set it in Settings.")
      }
      const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai")
      return new ChatGoogleGenerativeAI({
        model: userSettings.google_model,
        apiKey: userSettings.google_api_key,
        temperature: 0.3,
        maxOutputTokens: 1024,
      })
    }
    case "openrouter":
    default: {
      if (!userSettings.openrouter_api_key) {
        throw new Error("OpenRouter API key not configured. Please set it in Settings.")
      }
      const { ChatOpenAI } = await import("@langchain/openai")
      return new ChatOpenAI({
        model: userSettings.openrouter_model,
        apiKey: userSettings.openrouter_api_key,
        temperature: 0.3,
        maxTokens: 1024,
        configuration: {
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
            "X-Title": "NotebookZen",
          },
        },
        extraBody: {
          reasoning: { enabled: false },
        },
      })
    }
  }
}

// ─── POST /api/chat ──────────────────────────────────────────────────────

app.post("/chat", requireAuth, async (c) => {
  try {
    const { question } = await c.req.json()

    if (!question || !question.trim()) {
      return c.json({ error: "Question is required" }, 400)
    }

    const ctx = await getDb(c.env.HYPERDRIVE)
    const userId = await getUserId(ctx, c.get("userId"))

    if (!userId) {
      return c.json({ error: "User not found" }, 404)
    }

    // ── BYOK: Load per-user AI settings ──
    const userSettings = await getUserAISettings(ctx, userId)

    // ── Hybrid retrieval (Rovo-style) ──────────────────────────────────
    let contextNotes
    let retrievalMode

    const hybrid = await hybridRetrieve(ctx, c.env.AI, question, userId)

    if (hybrid.source === "hybrid" && hybrid.notes.length > 0) {
      contextNotes = hybrid.notes
      retrievalMode = "hybrid"
    } else {
      const fallback = await fallbackRetrieve(ctx, userId)
      contextNotes = fallback.notes
      retrievalMode = "fallback"
    }

    if (contextNotes.length === 0) {
      return c.json({
        answer:
          "You don't have any notes yet. Create some notes and I'll be able to help you find information in them!",
        sources: [],
      })
    }

    // ── Format context notes into prompt ───────────────────────────────
    const formattedNotes = contextNotes
      .map((note) => {
        const content = note.content || "(empty note)"
        return `[Note "${note.title}" (ID: ${note.id})]:\n${content}`
      })
      .join("\n\n---\n\n")

    // ── BYOK: Create model with user's own key ──
    // (Lazy-imports @langchain/* — first request may be slow but won't block cold start)
    const model = await createModel(userSettings)

    const prompt = SYSTEM_PROMPT.replace("{notes}", formattedNotes).replace(
      "{question}",
      question,
    )

    const response = await model.invoke([
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ])

    // ── Return relevant sources only (not all notes) ───────────────────
    const sources = contextNotes.map((note) => ({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
    }))

    return c.json({
      answer: response.content,
      sources,
      retrieval: retrievalMode,
    })
  } catch (error) {
    console.error("Chat error:", error)

    // Surface BYOK config errors to the user
    if (
      error.message?.includes("not configured") ||
      error.message?.includes("API key")
    ) {
      return c.json({ error: error.message }, 422)
    }

    return c.json({ error: "Failed to generate response" }, 500)
  }
})

export default app
