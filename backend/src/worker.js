// ────────────────────────────────────────────────────────────────────────────
// Cloudflare Workers entry — Hono app
// ────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono"
import { cors } from "hono/cors"
import { getSupabase } from "../supabaseClient.js"
import { requireAuth } from "./middleware/auth.js"
import chatRoutes from "./routes/chat.js"
import webhookRoutes from "./routes/webhooks/clerk.js"

const app = new Hono()

// ─── Global middleware ─────────────────────────────────────────────────────
// Inject Worker bindings (including secret_text) into process.env so
// @supabase/supabase-js, @clerk/backend, @langchain/* can read them.
app.use("*", async (c, next) => {
  for (const [key, value] of Object.entries(c.env)) {
    if (typeof value === "string") process.env[key] = value
  }
  await next()
})

// CORS – allow only the frontend origin
app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = process.env.FRONTEND_URL || "*"
      if (allowed === "*") return "*"
      return origin === allowed || origin === undefined ? allowed : null
    },
  }),
)

// ─── Public routes ─────────────────────────────────────────────────────────
app.get("/", (c) => c.text("Hello world."))
app.route("/api/webhooks", webhookRoutes)

// ─── Protected route guards ────────────────────────────────────────────────
app.use("/notes/*", requireAuth)
app.use("/api/chat", requireAuth)

// ─── Notes CRUD ────────────────────────────────────────────────────────────

// GET /notes  – list all notes for the authenticated user
app.get("/notes", async (c) => {
  const supabase = getSupabase()
  const clerkId = c.get("userId")

  // Resolve clerkId → userId, then fetch notes
  const { data: user } = await supabase
    .from('"User"')
    .select("id")
    .eq('"clerkId"', clerkId)
    .single()

  if (!user) return c.json([])

  const { data: notes } = await supabase
    .from('"Note"')
    .select("*")
    .eq('"userId"', user.id)
    .order('"createdAt"', { ascending: false })

  return c.json(notes || [])
})

// GET /notes/:id  – single note
app.get("/notes/:id", async (c) => {
  const id = Number(c.req.param("id"))
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400)

  const supabase = getSupabase()
  const { data: note } = await supabase
    .from('"Note"')
    .select("*")
    .eq('"id"', id)
    .single()

  return c.json(note || {})
})

// POST /notes  – create note for the authenticated user
app.post("/notes", async (c) => {
  const supabase = getSupabase()
  const clerkId = c.get("userId")
  const { title, content } = await c.req.json()

  const { data: user } = await supabase
    .from('"User"')
    .select("id")
    .eq('"clerkId"', clerkId)
    .single()

  if (!user) return c.json({ error: "User not found" }, 404)

  const { data: newNote } = await supabase
    .from('"Note"')
    .insert({ title, content, userId: user.id })
    .select()
    .single()

  return c.json({ message: "Create Success!", data: newNote })
})

// PUT /notes  – update note
app.put("/notes", async (c) => {
  const supabase = getSupabase()
  const { id, title, content } = await c.req.json()

  const { data: updatedNote } = await supabase
    .from('"Note"')
    .update({ title, content })
    .eq('"id"', id)
    .select()
    .single()

  return c.json({ message: "Update success", data: updatedNote })
})

// DELETE /notes  – delete note
app.delete("/notes", async (c) => {
  const supabase = getSupabase()
  const { id } = await c.req.json()

  await supabase.from('"Note"').delete().eq('"id"', id)

  return c.json({ message: "delete data", data: { id } })
})

// GET /notesCount/:id  – count notes for a user (by user's id, not clerkId)
app.get("/notesCount/:id", async (c) => {
  const supabase = getSupabase()
  const userId = Number(c.req.param("id"))

  const { count } = await supabase
    .from('"Note"')
    .select("*", { count: "exact", head: true })
    .eq('"userId"', userId)

  return c.json(count ?? 0)
})

// ─── AI Chat ───────────────────────────────────────────────────────────────
app.route("/api", chatRoutes)

// ─── Export ────────────────────────────────────────────────────────────────
export default app
