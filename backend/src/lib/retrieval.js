/**
 * Rovo-style hybrid retrieval for NotebookZen chat.
 *
 * 1. Embed the user's question via Workers AI
 * 2. pgvector cosine similarity → top-K most semantically similar notes
 * 3. For each top-K hit, expand with 1-hop graph neighbors from note_links
 * 4. Deduplicate and return the full context set
 *
 * @param {object} ctx — DB context from getDb() { db, sql, eq, inArray, notes, noteLinks }
 * @param {Fetcher} ai — Workers AI binding (c.env.AI)
 * @param {string} question — user's chat question
 * @param {number} userId — note owner
 */
export async function hybridRetrieve(ctx, ai, question, userId, opts = {}) {
  const { db, sql, eq, inArray, notes, noteLinks } = ctx
  const topK = opts.topK ?? 5
  const maxContext = opts.maxContext ?? 15

  const { embedQuery } = await import("./embeddings.js")
  const queryVector = await embedQuery(ai, question)

  if (!queryVector) {
    return { notes: [], source: "fallback" }
  }

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
    return { notes: [], source: "fallback" }
  }

  const expandedIds = new Set(topNoteIds)

  const outgoing = await db
    .select({ id: noteLinks.targetNoteId })
    .from(noteLinks)
    .where(inArray(noteLinks.sourceNoteId, topNoteIds))

  const incoming = await db
    .select({ id: noteLinks.sourceNoteId })
    .from(noteLinks)
    .where(inArray(noteLinks.targetNoteId, topNoteIds))

  for (const link of outgoing) expandedIds.add(link.id)
  for (const link of incoming) expandedIds.add(link.id)

  const finalIds = [...expandedIds].slice(0, maxContext)

  const contextNotes = await db
    .select()
    .from(notes)
    .where(inArray(notes.id, finalIds))

  const similarityMap = new Map(
    (vectorResults.rows || []).map((r) => [r.id, r.similarity]),
  )
  contextNotes.sort((a, b) => {
    const simA = similarityMap.get(a.id) ?? -1
    const simB = similarityMap.get(b.id) ?? -1
    return simB - simA
  })

  return { notes: contextNotes, source: "hybrid" }
}

/**
 * Fallback retrieval: fetch ALL notes (old behavior).
 *
 * @param {object} ctx — DB context from getDb()
 * @param {number} userId
 */
export async function fallbackRetrieve(ctx, userId) {
  const { db, sql, eq, notes } = ctx

  const allNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(sql`"createdAt" DESC`)

  return { notes: allNotes, source: "fallback" }
}
