"use client";

import { Suspense } from "react";
import AppLayout from "@/components/AppLayout";
import GraphView from "@/components/graph/GraphView";
import { buildGraph, type GraphData } from "@/lib/graph";
import { useNotes } from "@/context/NotesContext";

function GraphPageContent() {
  const { notes } = useNotes();
  const graphData: GraphData = notes.length > 0 ? buildGraph(notes) : { nodes: [], links: [] };

  return (
    <div className="h-full">
      {graphData ? (
        graphData.nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
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
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-[var(--zen-on-surface-variant)]">Loading graph…</p>
        </div>
      )}
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AppLayout>
        <GraphPageContent />
      </AppLayout>
    </Suspense>
  );
}
