"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useApi } from "@/lib/api";
import type { Note, Folder } from "@/lib/types";

type NotesContextValue = {
  notes: Note[];
  folders: Folder[];
  selectedNote: Note | null;
  selectedFolderId: number | null; // null = "All Notes"
  isLoading: boolean;

  setSelectedNote: (note: Note | null) => void;
  setSelectedFolderId: (id: number | null) => void;

  fetchNotes: () => Promise<void>;
  fetchFolders: () => Promise<void>;

  createNote: (title: string, content?: string, folderId?: number | null) => Promise<Note | null>;
  updateNote: (id: number, title: string, content: string) => Promise<boolean>;
  deleteNote: (id: number) => Promise<boolean>;
  moveNote: (noteId: number, folderId: number | null) => Promise<boolean>;

  createFolder: (name: string) => Promise<Folder | null>;
  renameFolder: (id: number, name: string) => Promise<boolean>;
  deleteFolder: (id: number) => Promise<boolean>;
};

const NotesContext = createContext<NotesContextValue | undefined>(undefined);

export function NotesProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api("/notes", { cache: "no-store" });
      if (!response.ok) throw new Error("fetch failed");
      const result = await response.json();
      setNotes(result);
    } catch (e) {
      console.error("Error fetching notes:", e);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const fetchFolders = useCallback(async () => {
    try {
      const response = await api("/folders", { cache: "no-store" });
      if (!response.ok) throw new Error("fetch failed");
      const result = await response.json();
      setFolders(result);
    } catch (e) {
      console.error("Error fetching folders:", e);
    }
  }, [api]);

  const createNote = useCallback(
    async (title: string, content?: string, folderId?: number | null) => {
      try {
        const response = await api("/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content: content || "", folderId }),
        });
        if (!response.ok) throw new Error("create failed");
        const result = await response.json();
        const newNote = result.data as Note;
        setNotes((prev) => [newNote, ...prev]);
        return newNote;
      } catch (e) {
        console.error("Error creating note:", e);
        return null;
      }
    },
    [api],
  );

  const updateNote = useCallback(
    async (id: number, title: string, content: string) => {
      try {
        const response = await api("/notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, title, content }),
        });
        if (!response.ok) throw new Error("update failed");
        const result = await response.json();
        const updated = result.data as Note;
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
        setSelectedNote((prev) => (prev?.id === id ? updated : prev));
        return true;
      } catch (e) {
        console.error("Error updating note:", e);
        return false;
      }
    },
    [api],
  );

  const deleteNote = useCallback(
    async (id: number) => {
      try {
        const response = await api("/notes", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!response.ok) throw new Error("delete failed");
        setNotes((prev) => prev.filter((n) => n.id !== id));
        setSelectedNote((prev) => (prev?.id === id ? null : prev));
        return true;
      } catch (e) {
        console.error("Error deleting note:", e);
        return false;
      }
    },
    [api],
  );

  const moveNote = useCallback(
    async (noteId: number, folderId: number | null) => {
      try {
        const response = await api("/notes/move", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteId, folderId }),
        });
        if (!response.ok) throw new Error("move failed");
        setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, folderId } : n)));
        return true;
      } catch (e) {
        console.error("Error moving note:", e);
        return false;
      }
    },
    [api],
  );

  const createFolder = useCallback(
    async (name: string) => {
      try {
        const response = await api("/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error("create failed");
        const result = await response.json();
        const newFolder = result.data as Folder;
        setFolders((prev) => [...prev, newFolder]);
        return newFolder;
      } catch (e) {
        console.error("Error creating folder:", e);
        return null;
      }
    },
    [api],
  );

  const renameFolder = useCallback(
    async (id: number, name: string) => {
      try {
        const response = await api("/folders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, name }),
        });
        if (!response.ok) throw new Error("rename failed");
        setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
        return true;
      } catch (e) {
        console.error("Error renaming folder:", e);
        return false;
      }
    },
    [api],
  );

  const deleteFolder = useCallback(
    async (id: number) => {
      try {
        const response = await api("/folders", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!response.ok) throw new Error("delete failed");
        setFolders((prev) => prev.filter((f) => f.id !== id));
        // Notes in this folder become uncategorized (FK SET NULL)
        setNotes((prev) => prev.map((n) => (n.folderId === id ? { ...n, folderId: null } : n)));
        return true;
      } catch (e) {
        console.error("Error deleting folder:", e);
        return false;
      }
    },
    [api],
  );

  return (
    <NotesContext.Provider
      value={{
        notes,
        folders,
        selectedNote,
        selectedFolderId,
        isLoading,
        setSelectedNote,
        setSelectedFolderId,
        fetchNotes,
        fetchFolders,
        createNote,
        updateNote,
        deleteNote,
        moveNote,
        createFolder,
        renameFolder,
        deleteFolder,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}
