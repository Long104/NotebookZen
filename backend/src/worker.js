// ────────────────────────────────────────────────────────────────────────────
// Cloudflare Workers entry — Hono app
// ────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono"
import { cors } from "hono/cors"
import { getDb } from "../db/db.js"
import { users, notes, noteLinks } from "../db/schema.js"
import { eq, desc, sql, inArray } from "drizzle-orm"
import { requireAuth } from "./middleware/auth.js"
import { syncNoteLinks } from "./lib/wikilinks.js"
import chatRoutes from "./routes/chat.js"
import settingsRoutes from "./routes/settings.js"
import webhookRoutes from "./routes/webhooks/clerk.js"

const app = new Hono()

// ─── Global middleware ─────────────────────────────────────────────────────
// Inject Worker bindings (including secret_text) into process.env so
// @clerk/backend, @langchain/* can read them.
app.use("*", async (c, next) => {
  for (const [key, value] of Object.entries(c.env)) {
    if (typeof value === "string") process.env[key] = value
  }
  await next()
})

// CORS – allow the frontend origin from FRONTEND_URL env binding
// (set by Terraform). Fallback to localhost for dev.
app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = process.env.FRONTEND_URL || "http://localhost:3000"
      if (!origin || origin === allowed) return allowed
      return null
    },
  }),
)

// ─── Public routes ─────────────────────────────────────────────────────────
app.get("/", (c) => c.text("Hello world."))
app.route("/api/webhooks", webhookRoutes)

// ─── Protected route guards ────────────────────────────────────────────────
app.use("/notes/*", requireAuth)
app.use("/api/chat", requireAuth)
app.use("/api/settings/*", requireAuth)

// ─── Notes CRUD ────────────────────────────────────────────────────────────

// GET /notes  – list all notes for the authenticated user
app.get("/notes", async (c) => {
  const db = getDb(c.env.HYPERDRIVE)
  const clerkId = c.get("userId")

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)

  if (!user) return c.json([])

  const result = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, user.id))
    .orderBy(desc(notes.createdAt))

  return c.json(result)
})

// GET /notes/graph – full graph { nodes, links } from persisted note_links
// MUST be registered before /notes/:id so :id doesn't catch "graph"
app.get("/notes/graph", async (c) => {
  const db = getDb(c.env.HYPERDRIVE)
  const clerkId = c.get("userId")

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)

  if (!user) return c.json({ nodes: [], links: [] })

  // Nodes: all user's notes
  const userNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, user.id))

  // Links: join note_links on source note → only this user's outgoing links
  const rawLinks = await db
    .select({
      source: noteLinks.sourceNoteId,
      target: noteLinks.targetNoteId,
    })
    .from(noteLinks)
    .innerJoin(notes, eq(noteLinks.sourceNoteId, notes.id))
    .where(eq(notes.userId, user.id))

  // Compute degree for node sizing (val)
  const degree = new Map()
  for (const link of rawLinks) {
    degree.set(link.source, (degree.get(link.source) || 0) + 1)
    degree.set(link.target, (degree.get(link.target) || 0) + 1)
  }

  const nodes = userNotes.map((note) => ({
    id: note.id,
    name: note.title,
    val: 1 + (degree.get(note.id) || 0),
    createdAt: note.createdAt,
  }))

  return c.json({ nodes, links: rawLinks })
})

// GET /notes/:id/neighbors – 1-hop neighbor notes (bidirectional)
// Used by Step 3's graph-augmented RAG retrieval.
app.get("/notes/:id/neighbors", async (c) => {
  const id = Number(c.req.param("id"))
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400)

  const db = getDb(c.env.HYPERDRIVE)

  // Outgoing + incoming edges
  const outgoing = await db
    .select({ id: noteLinks.targetNoteId })
    .from(noteLinks)
    .where(eq(noteLinks.sourceNoteId, id))

  const incoming = await db
    .select({ id: noteLinks.sourceNoteId })
    .from(noteLinks)
    .where(eq(noteLinks.targetNoteId, id))

  const neighborIds = [
    ...new Set([
      ...outgoing.map((l) => l.id),
      ...incoming.map((l) => l.id),
    ]),
  ]

  if (neighborIds.length === 0) return c.json([])

  const neighborNotes = await db
    .select()
    .from(notes)
    .where(inArray(notes.id, neighborIds))

  return c.json(neighborNotes)
})

// GET /notes/:id  – single note
app.get("/notes/:id", async (c) => {
  const id = Number(c.req.param("id"))
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400)

  const db = getDb(c.env.HYPERDRIVE)
  const [note] = await db
    .select()
    .from(notes)
    .where(eq(notes.id, id))
    .limit(1)

  return c.json(note || {})
})

// POST /notes  – create note for the authenticated user
app.post("/notes", async (c) => {
  const db = getDb(c.env.HYPERDRIVE)
  const clerkId = c.get("userId")
  const { title, content } = await c.req.json()

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)

  if (!user) return c.json({ error: "User not found" }, 404)

  const [newNote] = await db
    .insert(notes)
    .values({ title, content, userId: user.id })
    .returning()

  // Resolve [[wikilinks]] into note_links table
  await syncNoteLinks(db, newNote.id, content || "", user.id)

  return c.json({ message: "Create Success!", data: newNote })
})

// PUT /notes  – update note
app.put("/notes", async (c) => {
  const db = getDb(c.env.HYPERDRIVE)
  const { id, title, content } = await c.req.json()

  const [updatedNote] = await db
    .update(notes)
    .set({ title, content })
    .where(eq(notes.id, id))
    .returning()

  // Re-resolve [[wikilinks]] — wipe old outgoing links, insert fresh
  await syncNoteLinks(db, id, content || "", updatedNote.userId)

  return c.json({ message: "Update success", data: updatedNote })
})

// DELETE /notes  – delete note
app.delete("/notes", async (c) => {
  const db = getDb(c.env.HYPERDRIVE)
  const { id } = await c.req.json()

  await db.delete(notes).where(eq(notes.id, id))

  return c.json({ message: "delete data", data: { id } })
})

// GET /notesCount/:id  – count notes for a user (by user's id, not clerkId)
app.get("/notesCount/:id", async (c) => {
  const db = getDb(c.env.HYPERDRIVE)
  const userId = Number(c.req.param("id"))

  const [result] = await db
    .select({ count: sql`count(*)::int` })
    .from(notes)
    .where(eq(notes.userId, userId))

  return c.json(result?.count ?? 0)
})

// ─── AI Chat & Settings ────────────────────────────────────────────────────
app.route("/api", chatRoutes)
app.route("/api/settings", settingsRoutes)

// ─── Export ────────────────────────────────────────────────────────────────
export default app
