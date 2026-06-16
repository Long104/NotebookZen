"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Navbar from "@/components/Navbar";
import ZenEditor from "@/components/editor/ZenEditor";
import MarkdownRenderer from "@/components/editor/MarkdownRenderer";
import { ArrowLeft, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { fetchWithRetry } from "@/lib/api";
import { mergePendingWithFetched } from "@/lib/pendingNotes";

export type Note = {
    id: number;
    title: string;
    content?: string;
    createdAt: string;
};

function RealShowListContent() {
    const { getToken } = useAuth();
    const { isSignedIn, isLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [noteList, setNoteList] = useState<Note[]>(() => mergePendingWithFetched([]));
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [actionError, setActionError] = useState("");

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/");
        }
    }, [isLoaded, isSignedIn, router]);

    useEffect(() => {
        // Don't fetch until Clerk has loaded
        if (!isLoaded) return;

        const abortController = new AbortController();

        const fetchData = async () => {
            try {
                const token = await getToken();
                if (!token) {
                    console.warn("No auth token available yet — skipping fetch");
                    return;
                }

                const response = await fetchWithRetry(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/notes`,
                    {
                        signal: abortController.signal,
                        cache: "no-store",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    },
                );
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}`);
                }
                const result = await response.json();
                const mergedNotes = mergePendingWithFetched(result);
                // Ignore result if the effect was cleaned up
                if (abortController.signal.aborted) return;
                setNoteList(mergedNotes);

                const noteId = searchParams.get("noteId");
                if (noteId) {
                    const targetNote = result.find(
                        (note: Note) => note.id === Number(noteId),
                    );
                    if (targetNote) setSelectedNote(targetNote);
                }
            } catch (error) {
                if (abortController.signal.aborted) return; // ignore cancellations
                console.error("Error fetching notes:", error);
            }
        };
        fetchData();

        return () => abortController.abort();
    }, [isLoaded, getToken, searchParams]);

    if (!isLoaded || !isSignedIn) {
        return null;
    }

    function handleSelectedNote(note: Note) {
        setSelectedNote(note);
        setIsEditing(false);
    }

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
        setActionError("");

        const token = await getToken();
        if (!token) {
            console.error("No auth token available");
            return;
        }

        // Snapshot for rollback
        const prevNote = selectedNote;

        // Optimistic UI: update immediately
        const optimisticNote = { ...prevNote, title: editTitle, content: editContent };
        setNoteList((prev) =>
            prev.map((note) => (note.id === prevNote.id ? optimisticNote : note)),
        );
        setSelectedNote(optimisticNote);
        setIsSaving(true);

        try {
            const response = await fetchWithRetry(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/notes`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        id: prevNote.id,
                        title: editTitle,
                        content: editContent,
                    }),
                },
            );
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            const result = await response.json();
            const updatedNote = result.data;
            setNoteList((prev) =>
                prev.map((note) => (note.id === updatedNote.id ? updatedNote : note)),
            );
            setSelectedNote(updatedNote);
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating note:", error);
            // Rollback
            setNoteList((prev) =>
                prev.map((note) => (note.id === prevNote.id ? prevNote : note)),
            );
            setSelectedNote(prevNote);
            setActionError("Failed to save. Please try again.");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDeleteButton() {
        if (!selectedNote || isDeleting) return;
        setActionError("");

        const token = await getToken();
        if (!token) {
            console.error("No auth token available");
            return;
        }

        // Snapshot for rollback
        const prevNote = selectedNote;

        // Optimistic UI: remove note immediately
        setNoteList((prev) => prev.filter((note) => note.id !== prevNote.id));
        setSelectedNote(null);
        setIsEditing(false);
        setIsDeleting(true);

        try {
            const response = await fetchWithRetry(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/notes`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ id: prevNote.id }),
                },
            );
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
        } catch (error) {
            console.error("Error deleting note:", error);
            // Rollback: restore the note
            setNoteList((prev) => {
                const withoutNote = prev.filter((note) => note.id !== prevNote.id);
                return [...withoutNote, prevNote].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                );
            });
            setSelectedNote(prevNote);
            setActionError("Failed to delete. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <div className="flex min-h-screen">
                    <div className="w-[30%] min-w-[280px] bg-[var(--zen-surface-low)] h-screen overflow-y-auto">
                        <div className="p-5 flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-sm text-[var(--zen-on-surface-variant)]">
                                <ArrowLeft size={14} />
                                <span>Notes</span>
                            </div>
                            <h2 className="text-lg font-medium">Your Notes</h2>
                        </div>
                        <div className="px-3 flex flex-col gap-3 pb-4">
                            {noteList.length === 0 && (
                                <p className="text-sm text-[var(--zen-on-surface-variant)] px-2 py-8 text-center">
                                    No notes yet. Create one to get started.
                                </p>
                            )}
                            {noteList.map((note) => (
                                <div
                                    key={note.id}
                                    className={`zen-card ${selectedNote?.id === note.id ? "zen-card-active" : ""}`}
                                    onClick={() => handleSelectedNote(note)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSelectedNote(note);
                                    }}
                                >
                                    <div className="text-sm font-medium truncate">
                                        {note.title}
                                    </div>
                                    <div className="text-xs text-[var(--zen-on-surface-variant)] mt-1">
                                        {new Date(note.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto">
                        {actionError && (
                            <div className="max-w-3xl mx-auto mb-4 px-4 py-3 rounded-lg bg-[var(--zen-error-container)] text-[var(--zen-on-error-container)] text-sm flex items-center justify-between">
                                <span>{actionError}</span>
                                <button
                                    type="button"
                                    onClick={() => setActionError("")}
                                    className="ml-4 opacity-70 hover:opacity-100"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                        {selectedNote ? (
                            isEditing ? (
                                <div className="max-w-3xl mx-auto flex flex-col gap-6">
                                    <div className="flex justify-between items-center">
                                        <input
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="zen-input"
                                            placeholder="Note title"
                                        />
                                        <div className="flex gap-2 ml-4">
                                            <button
                                                type="button"
                                                className="zen-btn-primary flex items-center gap-1.5 text-xs disabled:opacity-50"
                                                disabled={isSaving}
                                                onClick={handleSaveUpdate}
                                            >
                                                {isSaving ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Check size={14} />
                                                )}
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
                                            <h2 className="text-2xl font-semibold tracking-tight">
                                                {selectedNote.title}
                                            </h2>
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
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

export default function RealShowList() {
    return (
        <Suspense fallback={<div className="min-h-screen" />}>
            <RealShowListContent />
        </Suspense>
    );
}
