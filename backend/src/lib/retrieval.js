import { sql, eq, inArray } from "drizzle-orm"
import { notes, noteLinks } from "../../db/schema.js"
import { embedQuery } from "./embeddings.js"

/**
 * Rovo-style hybrid retrieval for NotebookZen chat.
 *
 * 1. Embed the user's question via Workers AI
 * 2. pgvector cosine similarity → top-K most semantically similar notes
 * 3. For each top-K hit, expand with 1-hop graph neighbors from note_links
 * 4. Deduplicate and return the full context set
 *
 * This replaces the old "stuff ALL notes into the prompt" approach.
 * Scales to thousands of notes — only the relevant subset enters the LLM context.
 *
 * @param {ReturnType<typeof import("../../db/db.js").getDb>} db
 * @param {Fetcher} ai — Workers AI binding (c.env.AI)
 * @param {string} question — user's chat question
 * @param {number} userId — note owner
 * @param {object} opts
 * @param {number} opts.topK — vector search results (default 5)
 * @param {number} opts.maxContext — max notes in final context (default 15)
 * @returns {Promise<{ notes: Array, source: "hybrid" | "fallback" }>}
 */
export async function hybridRetrieve(db, ai, question, userId, opts = {}) {
  const topK = opts.topK ?? 5
  const maxContext = opts.maxContext ?? 15

  // ── Step 1: Embed the question ──────────────────────────────────
  const queryVector = await embedQuery(ai, question)

  if (!queryVector) {
    // AI binding not available or embedding failed — caller should fall back
    return { notes: [], source: "fallback" }
  }

  // ── Step 2: pgvector cosine similarity search ───────────────────
  // <=> is cosine distance. Lower = more similar. 1 - distance = similarity.
  const vectorStr = `[${queryVector.join(",")}]`

  const vectorResults = await db.execute(sql`
    SELECT id, title, content,
      1 - (embedding <=> ${vectorStr}::vector) AS similarity
    FROM "Note"
    WHERE "userId" = ${userId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT ${topK}
  `)

  const topNoteIds = (vectorResults.rows || []).map((r) => r.id)

  if (topNoteIds.length === 0) {
    // No embeddings in DB yet — notes were created before Step 3
    return { notes: [], source: "fallback" }
  }

  // ── Step 3: Graph neighbor expansion (1-hop, bidirectional) ─────
  const expandedIds = new Set(topNoteIds)

  // Outgoing edges: top notes → their targets
  const outgoing = await db
    .select({ id: noteLinks.targetNoteId })
    .from(noteLinks)
    .where(inArray(noteLinks.sourceNoteId, topNoteIds))

  // Incoming edges: other notes → top notes
  const incoming = await db
    .select({ id: noteLinks.sourceNoteId })
    .from(noteLinks)
    .where(inArray(noteLinks.targetNoteId, topNoteIds))

  for (const link of outgoing) expandedIds.add(link.id)
  for (const link of incoming) expandedIds.add(link.id)

  // ── Step 4: Cap context size + fetch full notes ─────────────────
  const finalIds = [...expandedIds].slice(0, maxContext)

  const contextNotes = await db
    .select()
    .from(notes)
    .where(inArray(notes.id, finalIds))

  // Sort by similarity (put vector-matched notes first)
  const similarityMap = new Map(
    (vectorResults.rows || []).map((r) => [r.id, r.similarity]),
  )
  contextNotes.sort((a, b) => {
    const simA = similarityMap.get(a.id) ?? -1
    const simB = similarityMap.get(b.id) ?? -1
    return simB - simA // descending
  })

  return { notes: contextNotes, source: "hybrid" }
}

/**
 * Fallback retrieval: fetch ALL notes (old behavior).
 * Used when Workers AI is unavailable or no embeddings exist yet.
 *
 * @param {ReturnType<typeof import("../../db/db.js").getDb>} db
 * @param {number} userId
 */
export async function fallbackRetrieve(db, userId) {
  const allNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(sql`"createdAt" DESC`)

  return { notes: allNotes, source: "fallback" }
}
