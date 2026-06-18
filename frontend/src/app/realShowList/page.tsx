"use client";

import { useState, Suspense } from "react";
import AppLayout from "@/components/AppLayout";
import ZenEditor from "@/components/editor/ZenEditor";
import MarkdownRenderer from "@/components/editor/MarkdownRenderer";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { useNotes } from "@/context/NotesContext";

function NotesPageContent() {
  const { selectedNote, updateNote, deleteNote } = useNotes();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleEditNote() {
    if (!selectedNote) return;
    setIsEditing(true);
    setEditTitle(selectedNote.title);
    setEditContent(selectedNote.content || "");
  }

  function handleCancel() {
    setIsEditing(false);
  }

  async function handleSaveUpdate() {
    if (!selectedNote || isSaving) return;
    setIsSaving(true);
    const ok = await updateNote(selectedNote.id, editTitle, editContent);
    setIsSaving(false);
    if (ok) setIsEditing(false);
  }

  async function handleDeleteButton() {
    if (!selectedNote || isDeleting) return;
    setIsDeleting(true);
    await deleteNote(selectedNote.id);
    setIsDeleting(false);
    setIsEditing(false);
  }

  return (
    <div className="p-6 h-full">
      {selectedNote ? (
        isEditing ? (
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            {/* Sticky toolbar with Save/Cancel — always visible */}
            <div className="sticky top-0 z-10 -mx-6 px-6 py-2 bg-[var(--zen-surface)]/80 backdrop-blur-sm flex justify-between items-center gap-3">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="zen-input flex-1"
                placeholder="Note title"
              />
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  className="zen-btn-primary flex items-center gap-1.5 text-xs disabled:opacity-50"
                  disabled={isSaving}
                  onClick={handleSaveUpdate}
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="zen-btn-ghost flex items-center gap-1.5 text-xs disabled:opacity-50"
                  disabled={isSaving}
                  onClick={handleCancel}
                >
                  <X size={14} />
                  Cancel
                </button>
              </div>
            </div>
            <div className="text-xs text-[var(--zen-on-surface-variant)]">
              {new Date(selectedNote.createdAt).toLocaleString()}
            </div>
            <ZenEditor
              initialContent={editContent}
              onUpdate={(md) => setEditContent(md)}
              placeholder="Edit your note..."
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{selectedNote.title}</h2>
                <div className="text-xs text-[var(--zen-on-surface-variant)] mt-2">
                  {new Date(selectedNote.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="zen-btn-ghost flex items-center gap-1.5 text-xs disabled:opacity-50"
                  disabled={isDeleting}
                  onClick={handleEditNote}
                >
                  <Pencil size={14} />
                  Edit
                </button>
                <button
                  type="button"
                  className="zen-btn-ghost flex items-center gap-1.5 text-xs text-[var(--zen-error)] disabled:opacity-50"
                  disabled={isDeleting}
                  onClick={handleDeleteButton}
                >
                  {isDeleting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
            <MarkdownRenderer content={selectedNote.content || ""} />
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3 h-full justify-center items-center">
          <div className="text-xl font-medium">Select a Note</div>
          <div className="text-sm text-[var(--zen-on-surface-variant)]">
            Choose a note from the sidebar to view its content
          </div>
        </div>
      )}
    </div>
  );
}

export default function RealShowList() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AppLayout>
        <NotesPageContent />
      </AppLayout>
    </Suspense>
  );
}
