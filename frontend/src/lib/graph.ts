import type { Note } from "@/lib/types";

export type { Note };

export type GraphNode = {
    id: number;
    name: string;
    val: number;
    createdAt: string;
};

export type GraphLink = {
    source: number;
    target: number;
};

export type GraphData = {
    nodes: GraphNode[];
    links: GraphLink[];
};

/**
 * Regex matching Obsidian-style wikilinks: [[Title]] or [[Title|alias]]
 * Capture group 1 = the title.
 */
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

/**
 * Extract all [[Note Title]] references from note content.
 * Returns trimmed titles in their original casing.
 */
export function extractWikilinks(content: string): string[] {
    const matches = [...(content || "").matchAll(WIKILINK_RE)];
    return matches.map((m) => m[1].trim());
}

/**
 * Build a force-graph data structure from a list of notes.
 *
 * Nodes  = every note.
 * Links  = note A -> note B when A's content contains [[B's title]].
 *          Matching is case-insensitive. Self-loops and duplicates are dropped.
 * val    = 1 + total degree (in + out), so hub notes render larger.
 *
 * This is the single source of truth for the graph structure.
 * Both the visualization (react-force-graph) and the future Rovo-style
 * retrieval layer will consume the same { nodes, links } shape.
 */
export function buildGraph(notes: Note[]): GraphData {
    const titleToId = new Map<string, number>();
    for (const note of notes) {
        titleToId.set(note.title.toLowerCase().trim(), note.id);
    }

    const degree = new Map<number, number>();
    const linkSet = new Set<string>();
    const links: GraphLink[] = [];

    for (const note of notes) {
        const refs = extractWikilinks(note.content || "");
        for (const ref of refs) {
            const targetId = titleToId.get(ref.toLowerCase().trim());
            if (targetId === undefined) continue;
            if (targetId === note.id) continue;

            const key = `${note.id}-${targetId}`;
            if (linkSet.has(key)) continue;
            linkSet.add(key);

            links.push({ source: note.id, target: targetId });
            degree.set(note.id, (degree.get(note.id) || 0) + 1);
            degree.set(targetId, (degree.get(targetId) || 0) + 1);
        }
    }

    const nodes: GraphNode[] = notes.map((note) => ({
        id: note.id,
        name: note.title,
        val: 1 + (degree.get(note.id) || 0),
        createdAt: note.createdAt,
    }));

    return { nodes, links };
}
