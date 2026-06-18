"use client";

import { useState, useEffect } from "react";
import { useNotes } from "@/context/NotesContext";
import {
  Plus,
  Folder as FolderIcon,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Trash2,
  Loader2,
} from "lucide-react";

export default function NoteSidebar() {
  const {
    notes,
    folders,
    selectedNote,
    selectedFolderId,
    setSelectedNote,
    fetchNotes,
    fetchFolders,
    createNote,
    createFolder,
    deleteFolder,
    moveNote,
    isLoading,
  } = useNotes();

  const [expandedFolders, setExpandedFolders] = useState<Set<number | "all">>(new Set(["all"]));
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState<number | "all" | null>(null);

  useEffect(() => {
    fetchNotes();
    fetchFolders();
  }, [fetchNotes, fetchFolders]);

  const toggleFolder = (id: number | "all") => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function handleCreateNote() {
    setShowCreateMenu(false);
    setIsCreating(true);
    const note = await createNote("Untitled", "", selectedFolderId);
    setIsCreating(false);
    if (note) setSelectedNote(note);
  }

  async function handleCreateFolder() {
    setShowCreateMenu(false);
    const name = prompt("Folder name");
    if (name?.trim()) {
      await createFolder(name.trim());
    }
  }

  async function handleDeleteFolder(id: number) {
    if (!confirm("Delete this folder? Notes will become uncategorized.")) return;
    await deleteFolder(id);
  }

  // Drag & drop handlers
  function handleNoteDragStart(e: React.DragEvent, noteId: number) {
    e.dataTransfer.setData("text/note-id", String(noteId));
    e.dataTransfer.effectAllowed = "move";
  }

  function handleFolderDrop(e: React.DragEvent, folderId: number | "all" | null) {
    e.preventDefault();
    setDragOverFolderId(null);
    const noteId = Number(e.dataTransfer.getData("text/note-id"));
    if (noteId) moveNote(noteId, folderId === "all" ? null : folderId);
  }

  function handleFolderDragOver(e: React.DragEvent, folderId: number | "all" | null) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolderId(folderId);
  }

  function handleFolderDragLeave() {
    setDragOverFolderId(null);
  }

  // Filter notes by selected folder
  const uncategorizedNotes = notes.filter((n) => !n.folderId);

  return (
    <div className="h-full flex flex-col bg-[var(--zen-surface-low)] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-medium tracking-wide">Notes</h2>
        <div className="relative">
          <button
            onClick={() => setShowCreateMenu((p) => !p)}
            className="zen-btn-ghost p-1.5"
            title="Create"
            disabled={isCreating}
          >
            {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
          </button>
          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowCreateMenu(false)} />
              <div className="absolute right-0 top-8 z-40 rounded-xl border border-[var(--zen-outline-variant)] bg-[var(--zen-surface-lowest)] shadow-lg py-1 min-w-[140px]">
                <button
                  onClick={handleCreateNote}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--zen-surface-low)] flex items-center gap-2"
                >
                  <FileText size={12} /> New Note
                </button>
                <button
                  onClick={handleCreateFolder}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--zen-surface-low)] flex items-center gap-2"
                >
                  <FolderIcon size={12} /> New Folder
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {/* All Notes section */}
        <div className="mb-2">
          <button
            onClick={() => toggleFolder("all")}
            onDrop={(e) => handleFolderDrop(e, "all")}
            onDragOver={(e) => handleFolderDragOver(e, "all")}
            onDragLeave={handleFolderDragLeave}
            className={`w-full flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedFolderId === null
                ? "text-[var(--zen-primary)]"
                : "text-[var(--zen-on-surface-variant)]"
            } hover:bg-[var(--zen-surface)] ${
              dragOverFolderId === "all"
                ? "ring-1 ring-[var(--zen-primary)] bg-[var(--zen-primary-container)]"
                : ""
            }`}
          >
            {expandedFolders.has("all") ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <FileText size={12} />
            <span>All Notes</span>
            <span className="ml-auto text-[10px] opacity-60">{notes.length}</span>
          </button>
          {expandedFolders.has("all") &&
            uncategorizedNotes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                isSelected={selectedNote?.id === note.id}
                onClick={() => setSelectedNote(note)}
                onDragStart={(e) => handleNoteDragStart(e, note.id)}
              />
            ))}
        </div>

        {/* Folders */}
        {folders.map((folder) => {
          const folderNotes = notes.filter((n) => n.folderId === folder.id);
          const isExpanded = expandedFolders.has(folder.id);
          return (
            <div key={folder.id} className="mb-2">
              <div className="flex items-center group">
                <button
                  onClick={() => toggleFolder(folder.id)}
                  onDrop={(e) => handleFolderDrop(e, folder.id)}
                  onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                  onDragLeave={handleFolderDragLeave}
                  className={`flex-1 flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    selectedFolderId === folder.id
                      ? "text-[var(--zen-primary)]"
                      : "text-[var(--zen-on-surface-variant)]"
                  } hover:bg-[var(--zen-surface)] ${
                    dragOverFolderId === folder.id
                      ? "ring-1 ring-[var(--zen-primary)] bg-[var(--zen-primary-container)]"
                      : ""
                  }`}
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {isExpanded ? <FolderOpen size={12} /> : <FolderIcon size={12} />}
                  <span className="truncate">{folder.name}</span>
                  <span className="ml-auto text-[10px] opacity-60">{folderNotes.length}</span>
                </button>
                <button
                  onClick={() => handleDeleteFolder(folder.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--zen-on-surface-variant)] hover:text-[var(--zen-error)] transition-opacity"
                  title="Delete folder"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              {isExpanded &&
                folderNotes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    isSelected={selectedNote?.id === note.id}
                    onClick={() => setSelectedNote(note)}
                    onDragStart={(e) => handleNoteDragStart(e, note.id)}
                  />
                ))}
            </div>
          );
        })}

        {notes.length === 0 && !isLoading && (
          <p className="text-xs text-[var(--zen-on-surface-variant)] px-3 py-8 text-center">
            No notes yet. Click + to create.
          </p>
        )}
      </div>
    </div>
  );
}

function NoteListItem({
  note,
  isSelected,
  onClick,
  onDragStart,
}: {
  note: { id: number; title: string; createdAt: string };
  isSelected: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`ml-4 pl-2 py-1.5 pr-2 rounded-md text-xs cursor-pointer transition-colors ${
        isSelected
          ? "bg-[var(--zen-primary-container)] text-[var(--zen-on-primary-container)] font-medium"
          : "text-[var(--zen-on-surface-variant)] hover:bg-[var(--zen-surface)]"
      }`}
    >
      <div className="truncate">{note.title}</div>
      <div className="text-[10px] opacity-50 mt-0.5">
        {new Date(note.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
