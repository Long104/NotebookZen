"use client";

import { StickyNote, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import ZenEditor from "@/components/editor/ZenEditor";
import { fetchWithRetry } from "@/lib/api";

export default function CreateMenu() {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { getToken } = useAuth();
    const router = useRouter();

    async function createZenNote(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        const token = await getToken();
        if (!token) {
            setError("You must be signed in to create a note.");
            return;
        }
        if (!title) {
            setError("Title is required.");
            return;
        }

        setLoading(true);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        try {
            const res = await fetchWithRetry(`${process.env.NEXT_PUBLIC_BACKEND_URL}/notes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ title, content }),
                signal: controller.signal,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setError(data?.detail || `Request failed with status ${res.status}`);
                return;
            }

            setTitle("");
            setContent("");
            router.push("/realShowList");
        } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") {
                setError("Request timed out. Database connection may be exhausted. Try again.");
            } else {
                setError("Network error. Please check your connection and try again.");
            }
        } finally {
            clearTimeout(timeout);
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-3xl mx-auto px-6 py-12">
            <form onSubmit={createZenNote} className="flex flex-col gap-8">
                <div className="text-sm text-[var(--zen-on-surface-variant)] tracking-wide uppercase">
                    Write Your Thoughts
                </div>

                {error && (
                    <div className="text-[var(--zen-error)] text-sm">{error}</div>
                )}

                <input
                    placeholder="Untitled Note"
                    className="zen-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                <div className="min-h-[50vh]">
                    <ZenEditor
                        initialContent={content}
                        onUpdate={(md) => setContent(md)}
                        placeholder="Start writing here..."
                    />
                </div>

                <div className="flex gap-3 justify-center pt-4">
                    <button type="submit" disabled={loading} className="zen-btn-primary flex items-center gap-2">
                        {loading ? (
                            <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                            <StickyNote size={16} />
                        )}
                        {loading ? "Saving..." : "Save Note"}
                    </button>
                    <button
                        type="button"
                        className="zen-btn-ghost flex items-center gap-2"
                        onClick={() => router.back()}
                    >
                        <X size={16} />
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
