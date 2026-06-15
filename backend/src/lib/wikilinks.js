import { eq } from "drizzle-orm"
import { notes, noteLinks } from "../../db/schema.js"

/**
 * Same regex as frontend src/lib/graph.ts — keep in sync.
 * Matches [[Title]] and [[Title|alias]] (Obsidian-style).
 */
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g

/**
 * Extract raw [[Title]] references from note content.
 * Returns trimmed titles in their original casing.
 */
export function extractWikilinks(content) {
  const matches = [...(content || "").matchAll(WIKILINK_RE)]
  return matches.map((m) => m[1].trim())
}

/**
 * Resolve a note's [[wikilinks]] into concrete note-to-note edges.
 *
 * 1. Parse [[Title]] refs from content.
 * 2. Look up the user's notes to match titles → note IDs (case-insensitive).
 * 3. Return deduplicated { sourceNoteId, targetNoteId } pairs.
 *    Self-loops and unresolved titles are silently dropped.
 *
 * @param {ReturnType<typeof import("../db/db.js").getDb>} db
 * @param {number} sourceNoteId  — the note being created/edited
 * @param {string} content       — the note's markdown content
 * @param {number} userId        — owner of the notes (scopes title matching)
 * @returns {Promise<Array<{ sourceNoteId: number, targetNoteId: number }>>}
 */
export async function resolveLinks(db, sourceNoteId, content, userId) {
  const refs = extractWikilinks(content)
  if (refs.length === 0) return []

  // Fetch all of the user's notes to build a title→id map.
  // For a personal notes app this is fast (< 1000 notes).
  const userNotes = await db
    .select({ id: notes.id, title: notes.title })
    .from(notes)
    .where(eq(notes.userId, userId))

  const titleToId = new Map()
  for (const note of userNotes) {
    titleToId.set(note.title.toLowerCase().trim(), note.id)
  }

  const seen = new Set()
  const links = []
  for (const ref of refs) {
    const targetId = titleToId.get(ref.toLowerCase().trim())
    if (targetId === undefined) continue
    if (targetId === sourceNoteId) continue // no self-loops

    const key = `${sourceNoteId}-${targetId}`
    if (seen.has(key)) continue
    seen.add(key)

    links.push({ sourceNoteId, targetNoteId: targetId })
  }

  return links
}

/**
 * Full lifecycle: wipe old outgoing links for a note, then re-resolve
 * from its current content and insert fresh links.
 *
 * Call this after POST /notes (create) or PUT /notes (update).
 * On DELETE, the FK cascade handles cleanup automatically — no call needed.
 *
 * @param {ReturnType<typeof import("../db/db.js").getDb>} db
 * @param {number} noteId
 * @param {string} content
 * @param {number} userId
 */
export async function syncNoteLinks(db, noteId, content, userId) {
  // Wipe existing outgoing links (incoming links from other notes stay)
  await db.delete(noteLinks).where(eq(noteLinks.sourceNoteId, noteId))

  // Resolve and insert fresh
  const links = await resolveLinks(db, noteId, content, userId)
  if (links.length > 0) {
    await db.insert(noteLinks).values(links)
  }

  return links.length
}
