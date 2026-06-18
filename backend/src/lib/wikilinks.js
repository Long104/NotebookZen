/**
 * Same regex as frontend src/lib/graph.ts — keep in sync.
 * Matches [[Title]] and [[Title|alias]] (Obsidian-style).
 */
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

/**
 * Extract wikilinks from note content.
 * Handles both raw [[wikilinks]] and escaped \[\[wikilinks\]\] — tiptap-markdown
 * escapes brackets during ProseMirror → Markdown serialization.
 */
export function extractWikilinks(content) {
  // Strip backslash escapes before brackets so we catch both [[ and \[\[
  const cleaned = (content || "").replace(/\\\[/g, "[").replace(/\\\]/g, "]");
  const matches = [...cleaned.matchAll(WIKILINK_RE)];
  return matches.map((m) => m[1].trim());
}

/**
 * Resolve a note's [[wikilinks]] into concrete note-to-note edges.
 *
 * @param {object} ctx — DB context from getDb() { db, eq, notes }
 */
export async function resolveLinks(ctx, sourceNoteId, content, userId) {
  const { db, eq, notes } = ctx;
  const refs = extractWikilinks(content);
  if (refs.length === 0) return [];

  const userNotes = await db
    .select({ id: notes.id, title: notes.title })
    .from(notes)
    .where(eq(notes.userId, userId));

  const titleToId = new Map();
  for (const note of userNotes) {
    titleToId.set(note.title.toLowerCase().trim(), note.id);
  }

  const seen = new Set();
  const links = [];
  for (const ref of refs) {
    const targetId = titleToId.get(ref.toLowerCase().trim());
    if (targetId === undefined) continue;
    if (targetId === sourceNoteId) continue;

    const key = `${sourceNoteId}-${targetId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    links.push({ sourceNoteId, targetNoteId: targetId });
  }

  return links;
}

/**
 * Full lifecycle: wipe old outgoing links for a note, then re-resolve.
 *
 * @param {object} ctx — DB context from getDb()
 */
export async function syncNoteLinks(ctx, noteId, content, userId) {
  const { db, eq, noteLinks } = ctx;

  await db.delete(noteLinks).where(eq(noteLinks.sourceNoteId, noteId));

  const links = await resolveLinks(ctx, noteId, content, userId);
  if (links.length > 0) {
    await db.insert(noteLinks).values(links);
  }

  return links.length;
}
