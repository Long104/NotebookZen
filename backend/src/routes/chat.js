import { Hono } from "hono"
import { createRequire } from "node:module"
import { getSupabase } from "../../supabaseClient.js"
import { requireAuth } from "../middleware/auth.js"
import { ChatOpenAI } from "@langchain/openai"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"

const require = createRequire(import.meta.url)
const app = new Hono()

const AI_PROVIDER = process.env.AI_PROVIDER || "openrouter"

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

function createModel() {
  switch (AI_PROVIDER) {
    case "google": {
      const { ChatGoogleGenerativeAI } = require("@langchain/google-genai")
      return new ChatGoogleGenerativeAI({
        model: process.env.GOOGLE_MODEL || "gemini-2.0-flash",
        apiKey: process.env.GOOGLE_API_KEY,
        temperature: 0.3,
        maxOutputTokens: 1024,
      })
    }
    case "openrouter":
    default:
      return new ChatOpenAI({
        model: process.env.OPENROUTER_MODEL,
        apiKey: process.env.OPENROUTER_API_KEY,
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

// ─── POST /api/chat ────────────────────────────────────────────────────────

app.post("/chat", requireAuth, async (c) => {
  try {
    const { question } = await c.req.json()
    const clerkId = c.get("userId")

    if (!question || !question.trim()) {
      return c.json({ error: "Question is required" }, 400)
    }

    const supabase = getSupabase()

    // Resolve clerkId → user
    const { data: user } = await supabase
      .from('"User"')
      .select("id")
      .eq('"clerkId"', clerkId)
      .single()

    if (!user) {
      return c.json({ error: "User not found" }, 404)
    }

    // Fetch notes for the user
    const { data: notes } = await supabase
      .from('"Note"')
      .select("*")
      .eq('"userId"', user.id)
      .order('"createdAt"', { ascending: false })

    if (!notes || notes.length === 0) {
      return c.json({
        answer:
          "You don't have any notes yet. Create some notes and I'll be able to help you find information in them!",
        sources: [],
      })
    }

    const formattedNotes = notes
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

    const model = createModel()

    const prompt = SYSTEM_PROMPT.replace("{notes}", relevantContext).replace(
      "{question}",
      question,
    )

    const response = await model.invoke([
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ])

    const sources = notes.map((note) => ({
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
    return c.json({ error: "Failed to generate response" }, 500)
  }
})

export default app
