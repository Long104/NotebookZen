"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Navbar from "@/components/Navbar";
import GraphView from "@/components/graph/GraphView";
import { buildGraph, type GraphData } from "@/lib/graph";

function GraphPageContent() {
    const { getToken } = useAuth();
    const { isSignedIn, isLoaded } = useUser();
    const router = useRouter();
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/");
        }
    }, [isLoaded, isSignedIn, router]);

    useEffect(() => {
        if (!isSignedIn) return;
        const fetchNotes = async () => {
            try {
                const token = await getToken();
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/notes`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    },
                );
                if (!response.ok) throw new Error("fetch failed");
                const notes = await response.json();
                setGraphData(buildGraph(notes));
            } catch {
                setError(true);
            }
        };
        fetchNotes();
    }, [isSignedIn, getToken]);

    if (!isLoaded || !isSignedIn) return null;

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <Navbar />
                {graphData ? (
                    graphData.nodes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-3">
                            <p className="text-xl font-medium">No notes yet</p>
                            <p className="text-sm text-[var(--zen-on-surface-variant)]">
                                Create notes with{" "}
                                <code className="px-1.5 py-0.5 rounded bg-[var(--zen-surface-low)]">
                                    [[wikilinks]]
                                </code>{" "}
                                to see them connected here
                            </p>
                        </div>
                    ) : graphData.links.length === 0 ? (
                        <>
                            <GraphView graphData={graphData} />
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-[var(--zen-surface-lowest)] rounded-full px-5 py-2 border border-[var(--zen-outline-variant)] border-dashed text-xs text-[var(--zen-on-surface-variant)]">
                                No links yet — type{" "}
                                <code className="px-1 py-0.5 rounded bg-[var(--zen-surface-low)]">
                                    [[Note Title]]
                                </code>{" "}
                                inside a note to connect them
                            </div>
                        </>
                    ) : (
                        <GraphView graphData={graphData} />
                    )
                ) : error ? (
                    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                        <p className="text-sm text-[var(--zen-error)]">
                            Failed to load notes. Try refreshing.
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                        <p className="text-sm text-[var(--zen-on-surface-variant)]">
                            Loading graph…
                        </p>
                    </div>
                )}
            </SidebarInset>
        </SidebarProvider>
    );
}

export default function GraphPage() {
    return (
        <Suspense fallback={<div className="min-h-screen" />}>
            <GraphPageContent />
        </Suspense>
    );
}
