/**
 * Pending notes helper — localStorage-backed optimistic UI.
 *
 * When the user creates a note, we add it to localStorage immediately so the
 * sidebar/list shows it instantly. Once the POST succeeds, we remove the pending
 * note and the real fetched data takes over.
 */

import type { Note } from "@/lib/types"

const PENDING_NOTES_KEY = "notebookzen:pending_notes"

export function addPendingNote(note: Omit<Note, "id"> & { id: number }) {
  const pending = getPendingNotes()
  localStorage.setItem(PENDING_NOTES_KEY, JSON.stringify([note, ...pending]))
}

export function removePendingNote(id: number) {
  const pending = getPendingNotes().filter((note) => note.id !== id)
  localStorage.setItem(PENDING_NOTES_KEY, JSON.stringify(pending))
}

export function getPendingNotes(): Note[] {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(PENDING_NOTES_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((note) => note && note.id && note.title && note.createdAt)
      .map((note) => ({
        ...note,
        content: note.content || "",
      }))
  } catch {
    return []
  }
}

export function mergePendingWithFetched(notes: Note[]): Note[] {
  const pending = getPendingNotes()
  const fetchedIds = new Set(notes.map((note) => note.id))

  return [...pending, ...notes.filter((note) => !fetchedIds.has(note.id))]
}
