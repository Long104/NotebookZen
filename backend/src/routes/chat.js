import { Hono } from "hono"
import { getDb } from "../../db/db.js"
import { users, notes, settings as settingsTable } from "../../db/schema.js"
import { eq, desc } from "drizzle-orm"
import { requireAuth } from "../middleware/auth.js"
import { ChatOpenAI } from "@langchain/openai"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
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

USER'S NOTES:
{notes}

QUESTION: {question}

ANSWER:`

// ─── Fetch user AI settings from DB ──────────────────────────────────────

async function getUserAISettings(db, userId) {
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

// ─── Create model from per-user settings ──────────────────────────────────

function createModel(userSettings) {
  const provider = userSettings.ai_provider

  switch (provider) {
    case "google": {
      if (!userSettings.google_api_key) {
        throw new Error("Google API key not configured. Please set it in Settings.")
      }
      const model = new ChatGoogleGenerativeAI({
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
    const clerkId = c.get("userId")

    if (!question || !question.trim()) {
      return c.json({ error: "Question is required" }, 400)
    }

    const db = getDb(c.env.HYPERDRIVE)

    // Resolve clerkId → user
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1)

    if (!user) {
      return c.json({ error: "User not found" }, 404)
    }

    // ── BYOK: Load per-user AI settings ──
    const userSettings = await getUserAISettings(db, user.id)

    // Fetch notes for the user
    const noteRows = await db
      .select()
      .from(notes)
      .where(eq(notes.userId, user.id))
      .orderBy(desc(notes.createdAt))

    if (!noteRows || noteRows.length === 0) {
      return c.json({
        answer:
          "You don't have any notes yet. Create some notes and I'll be able to help you find information in them!",
        sources: [],
      })
    }

    const formattedNotes = noteRows
      .map((note) => {
        const content = note.content || "(empty note)"
        return `[Note "${note.title}" (ID: ${note.id})]:\n${content}`
      })
      .join("\n\n---\n\n")

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 20000,
      chunkOverlap: 1000,
    })

    const chunks = await splitter.splitText(formattedNotes)
    const relevantContext = chunks.slice(0, 3).join("\n\n---\n\n")

    // ── BYOK: Create model with user's own key ──
    const model = createModel(userSettings)

    const prompt = SYSTEM_PROMPT.replace("{notes}", relevantContext).replace(
      "{question}",
      question,
    )

    const response = await model.invoke([
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ])

    const sources = noteRows.map((note) => ({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
    }))

    return c.json({
      answer: response.content,
      sources,
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
