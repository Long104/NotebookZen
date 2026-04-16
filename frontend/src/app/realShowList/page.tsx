"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Navbar from "@/components/Navbar";
import ZenEditor from "@/components/editor/ZenEditor";
import MarkdownRenderer from "@/components/editor/MarkdownRenderer";
import { ArrowLeft, Pencil, Trash2, Check, X } from "lucide-react";

type Note = {
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

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/");
        }
    }, [isLoaded, isSignedIn, router]);

    if (!isLoaded || !isSignedIn) {
        return null;
    }

    const [noteList, setNoteList] = useState<Note[]>([]);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            const token = await getToken();
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/notes`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    },
                );
                if (!response.ok) throw new Error("failed to fetch");
                const result = await response.json();
                setNoteList(result);

                const noteId = searchParams.get("noteId");
                if (noteId) {
                    const targetNote = result.find(
                        (note: Note) => note.id === Number(noteId),
                    );
                    if (targetNote) setSelectedNote(targetNote);
                }
            } catch (error) {
                console.error("Error fetching notes:", error);
            }
        };
        fetchData();
    }, [getToken, searchParams]);

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
        const token = await getToken();
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/notes`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        id: selectedNote!.id,
                        title: editTitle,
                        content: editContent,
                    }),
                },
            );
            if (!response.ok) throw new Error("Failed to update note");
            const result = await response.json();
            const updatedNote = result.data;
            setNoteList((prev) =>
                prev.map((note) => (note.id === updatedNote.id ? updatedNote : note)),
            );
            setSelectedNote(updatedNote);
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating note:", error);
        }
    }

    async function handleDeleteButton() {
        const token = await getToken();
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/notes`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ id: selectedNote!.id }),
                },
            );
            const result = await response.json();
            const deletedNote = result.data;
            setNoteList((prev) => prev.filter((note) => note.id !== deletedNote.id));
            setSelectedNote(null);
            setIsEditing(false);
        } catch (error) {
            console.error("Error deleting note:", error);
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
                                                className="zen-btn-primary flex items-center gap-1.5 text-xs"
                                                onClick={handleSaveUpdate}
                                            >
                                                <Check size={14} />
                                                Save
                                            </button>
                                            <button
                                                type="button"
                                                className="zen-btn-ghost flex items-center gap-1.5 text-xs"
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
                                                className="zen-btn-ghost flex items-center gap-1.5 text-xs"
                                                onClick={handleEditNote}
                                            >
                                                <Pencil size={14} />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="zen-btn-ghost flex items-center gap-1.5 text-xs text-[var(--zen-error)]"
                                                onClick={handleDeleteButton}
                                            >
                                                <Trash2 size={14} />
                                                Delete
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
