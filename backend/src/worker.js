// ────────────────────────────────────────────────────────────────────────────
// Cloudflare Workers entry — Hono app
// ────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono"
import { cors } from "hono/cors"
import { getDb } from "../db/db.js"
import { requireAuth } from "./middleware/auth.js"
import { getUserId } from "./lib/db.js"
import { syncNoteLinks } from "./lib/wikilinks.js"
import { embedNote } from "./lib/embeddings.js"
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

// CORS – allow the frontend origin from FRONTEND_URL env binding.
// Uses hostname matching so protocols/ports don't break the check.
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return origin
      const allowed = process.env.FRONTEND_URL
      if (!allowed) return origin // dev mode — permissive
      try {
        const allowedHost = new URL(allowed).hostname
        const originHost = new URL(origin).hostname
        if (originHost === allowedHost) return origin
      } catch {}
      return null
    },
  }),
)

// Prevent browser caching of all API responses.
// Without this, browsers serve stale GET /notes after a DELETE,
// making it look like deletes don't persist.
app.use("*", async (c, next) => {
  await next()
  c.header("Cache-Control", "no-store, no-cache, must-revalidate")
})

// ─── Global error handler ──────────────────────────────────────────────────
// Catches unhandled exceptions (e.g. DB connection failure) and returns a
// proper JSON 500 with CORS headers so the browser can read the error.
app.onError((err, c) => {
  console.error("Unhandled error:", err?.message, err?.stack)
  // Ensure CORS headers are on error responses — Hono's CORS middleware sets
  // them before await next(), but onError replaces c.res, potentially losing
  // them. Setting them here guarantees the browser can read the error.
  const allowedOrigin = process.env.FRONTEND_URL || "*"
  c.header("Access-Control-Allow-Origin", allowedOrigin)
  c.header("Access-Control-Allow-Credentials", "true")
  return c.json({ error: "Internal server error" }, 500)
})

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
  const ctx = await getDb(c.env.HYPERDRIVE)
  const { db, eq, desc, notes } = ctx
  const userId = await getUserId(ctx, c.get("userId"))
  if (!userId) return c.json([])

  const result = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.createdAt))

  return c.json(result)
})

// GET /notes/graph – full graph { nodes, links } from persisted note_links
// MUST be registered before /notes/:id so :id doesn't catch "graph"
app.get("/notes/graph", async (c) => {
  const ctx = await getDb(c.env.HYPERDRIVE)
  const { db, eq, notes, noteLinks } = ctx
  const userId = await getUserId(ctx, c.get("userId"))
  if (!userId) return c.json({ nodes: [], links: [] })

  const userNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))

  const rawLinks = await db
    .select({
      source: noteLinks.sourceNoteId,
      target: noteLinks.targetNoteId,
    })
    .from(noteLinks)
    .innerJoin(notes, eq(noteLinks.sourceNoteId, notes.id))
    .where(eq(notes.userId, userId))

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
app.get("/notes/:id/neighbors", async (c) => {
  const id = Number(c.req.param("id"))
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400)

  const { db, eq, inArray, notes, noteLinks } = await getDb(c.env.HYPERDRIVE)

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

// GET /notes/:id  – single note (must belong to caller)
app.get("/notes/:id", async (c) => {
  const id = Number(c.req.param("id"))
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400)

  const ctx = await getDb(c.env.HYPERDRIVE)
  const { db, eq, notes } = ctx
  const userId = await getUserId(ctx, c.get("userId"))
  if (!userId) return c.json({ error: "User not found" }, 404)

  const [note] = await db
    .select()
    .from(notes)
    .where(eq(notes.id, id))
    .limit(1)

  if (!note) return c.json({ error: "Note not found" }, 404)
  if (note.userId !== userId) return c.json({ error: "Unauthorized" }, 403)

  return c.json(note)
})

// POST /notes  – create note for the authenticated user
// Non-critical work (wikilinks, embeddings) deferred to background via
// ctx.waitUntil() to minimize DB pool pressure and prevent Worker hangs.
app.post("/notes", async (c) => {
  const ctx = await getDb(c.env.HYPERDRIVE)
  const { db, eq, sql, notes } = ctx
  const userId = await getUserId(ctx, c.get("userId"))
  const { title, content } = await c.req.json()

  if (!userId) return c.json({ error: "User not found" }, 404)

  const [newNote] = await db
    .insert(notes)
    .values({ title, content, userId })
    .returning()

  // Defer non-critical work — user gets immediate response, background
  // tasks finish within seconds. If they fail, note still exists.
  c.executionCtx.waitUntil(
    (async () => {
      try {
        await syncNoteLinks(ctx, newNote.id, content || "", userId)
      } catch (e) {
        console.error("syncNoteLinks (bg) failed:", e?.message)
      }
      try {
        const vector = await embedNote(c.env.AI, title, content || "")
        if (vector) {
          const vecStr = `[${vector.join(",")}]`
          await db.execute(sql`UPDATE "Note" SET embedding = ${vecStr}::vector WHERE id = ${newNote.id}`)
        }
      } catch (e) {
        console.error("Embedding (bg) failed:", e?.message)
      }
    })()
  )

  return c.json({ message: "Create Success!", data: newNote })
})

// PUT /notes  – update note (must belong to caller)
// Wikilinks + embeddings deferred to background.
app.put("/notes", async (c) => {
  const ctx = await getDb(c.env.HYPERDRIVE)
  const { db, eq, sql, notes } = ctx
  const { id, title, content } = await c.req.json()

  const userId = await getUserId(ctx, c.get("userId"))
  if (!userId) return c.json({ error: "User not found" }, 404)

  // Ownership check — prevents IDOR
  const [existing] = await db
    .select({ userId: notes.userId })
    .from(notes)
    .where(eq(notes.id, id))
    .limit(1)

  if (!existing) return c.json({ error: "Note not found" }, 404)
  if (existing.userId !== userId) return c.json({ error: "Unauthorized" }, 403)

  const [updatedNote] = await db
    .update(notes)
    .set({ title, content })
    .where(eq(notes.id, id))
    .returning()

  // Defer non-critical work
  c.executionCtx.waitUntil(
    (async () => {
      try {
        await syncNoteLinks(ctx, id, content || "", userId)
      } catch (e) {
        console.error("syncNoteLinks (bg) failed:", e?.message)
      }
      try {
        const vector = await embedNote(c.env.AI, title, content || "")
        if (vector) {
          const vecStr = `[${vector.join(",")}]`
          await db.execute(sql`UPDATE "Note" SET embedding = ${vecStr}::vector WHERE id = ${id}`)
        }
      } catch (e) {
        console.error("Embedding (bg) failed:", e?.message)
      }
    })()
  )

  return c.json({ message: "Update success", data: updatedNote })
})

// DELETE /notes  – delete note (must belong to caller)
// noteLinks cleanup is automatic — schema has onDelete: CASCADE on both
// sourceNoteId and targetNoteId foreign keys.
// Single-query delete: WHERE id = ? AND userId = ? ensures ownership
// without a separate SELECT. If the note doesn't belong to the caller,
// the WHERE matches nothing and we return 404.
app.delete("/notes", async (c) => {
  const ctx = await getDb(c.env.HYPERDRIVE)
  const { db, eq, and, notes } = ctx
  const userId = await getUserId(ctx, c.get("userId"))
  if (!userId) return c.json({ error: "User not found" }, 404)

  const body = await c.req.json().catch(() => ({}))
  const { id } = body

  if (!id || isNaN(Number(id))) {
    return c.json({ error: "Note ID is required" }, 400)
  }

  // Single atomic operation: delete only if id AND userId match
  const [deleted] = await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning({ id: notes.id })

  if (!deleted) return c.json({ error: "Note not found" }, 404)

  return c.json({ message: "delete data", data: { id } })
})

// GET /notesCount/:id  – count notes for a user (by user's id, not clerkId)
app.get("/notesCount/:id", async (c) => {
  const { db, eq, sql, notes } = await getDb(c.env.HYPERDRIVE)
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
export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx)
  },

  /**
   * CRON trigger — pre-warms ALL heavy modules so user requests never
   * pay the cold-start CPU cost.
   *
   * Every 2 minutes this fires and calls getDb(), which:
   *   1. Dynamically imports pg + drizzle-orm + schema (~5ms CPU)
   *   2. Creates the Hyperdrive Pool (~1ms CPU)
   *   3. Caches everything in the isolate's module-level state
   *
   * After this, user requests find everything pre-loaded:
   *   getDb() returns instantly (cached), queries just run (~2ms total).
   */
  async scheduled(event, env, ctx) {
    try {
      ctx.waitUntil(getDb(env.HYPERDRIVE))
    } catch (e) {
      // Non-fatal — the Worker stays warm even if pre-warm fails
    }
  },
}
