"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import SpriteText from "three-spritetext";
import { useTheme } from "@/lib/theme";
import type { GraphData } from "@/lib/graph";

/**
 * react-force-graph-2d / -3d both touch window/document at import time
 * (via d3-force + force-graph). Must be dynamically loaded with ssr disabled.
 *
 * three-spritetext is safe to import at module level — it does NOT touch
 * window/document at import time, only when instantiated. The constructor
 * is called inside nodeThreeObject which only runs client-side (3D graph
 * renders client-only via the dynamic import above).
 */
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
    ssr: false,
    loading: () => <GraphLoading />,
});
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
    ssr: false,
    loading: () => <GraphLoading />,
});

function GraphLoading() {
    return (
        <div className="flex items-center justify-center w-full h-full">
            <span className="text-sm text-[var(--zen-on-surface-variant)]">
                Loading graph engine…
            </span>
        </div>
    );
}

type GraphViewProps = {
    graphData: GraphData;
};

export default function GraphView({ graphData }: GraphViewProps) {
    const router = useRouter();
    const { theme } = useTheme();
    const [mode, setMode] = useState<"2d" | "3d">("2d");
    const fgRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState({ width: 800, height: 600 });

    /* ---- theme colours ---- */
    const colors = useMemo(() => {
        if (theme === "dark") {
            return {
                background: "#1a1c1a",
                node: "#c6dac8",
                link: "#5c605c",
                text: "#e0e4de",
                highlight: "#d4e8d6",
            };
        }
        return {
            background: "#faf9f6",
            node: "#516355",
            link: "#777c77",
            text: "#2f3430",
            highlight: "#d4e8d6",
        };
    }, [theme]);

    /* ---- container sizing ---- */
    useEffect(() => {
        const update = () => {
            if (containerRef.current) {
                setDims({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                });
            }
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    /* ---- navigation ---- */
    const handleNodeClick = useCallback(
        (node: any) => {
            router.push(`/realShowList?noteId=${node.id}`);
        },
        [router],
    );

    /* ---- 2D always-on labels ---- */
    const paint2DNode = useCallback(
        (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.name as string;
            const fontSize = Math.max(8, 13 / globalScale);
            ctx.font = `${fontSize}px sans-serif`;

            // Node radius scales with val (connection count)
            const r = 4 + Math.sqrt(node.val) * 2;

            // Filled circle
            ctx.fillStyle = colors.node;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.fill();

            // Label below the circle
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = colors.text;
            ctx.fillText(label, node.x, node.y + r + fontSize * 0.7);
        },
        [colors],
    );

    /* ---- 3D always-on labels (SpriteText) ---- */
    const threeNodeObject = useCallback(
        (node: any) => {
            const sprite = new SpriteText(node.name);
            sprite.color = colors.text;
            sprite.textHeight = 5;
            sprite.padding = 1;
            sprite.position.y = 6;
            return sprite;
        },
        [colors],
    );

    /* ---- tune force simulation after mount ---- */
    useEffect(() => {
        const fg = fgRef.current;
        if (!fg) return;
        const charge = fg.d3Force("charge");
        if (charge) charge.strength(-350);
        const link = fg.d3Force("link");
        if (link) link.distance(60);
        fg.d3ReheatSimulation();
    }, [graphData, mode]);

    return (
        <div
            ref={containerRef}
            className="w-full h-[calc(100vh-4rem)] relative"
        >
            {/* View toggle */}
            <div className="absolute top-4 left-4 z-10 flex gap-1 bg-[var(--zen-surface-lowest)] rounded-full p-1 border border-[var(--zen-outline-variant)] border-dashed">
                <button
                    type="button"
                    onClick={() => setMode("2d")}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        mode === "2d"
                            ? "bg-[var(--zen-primary)] text-[var(--zen-on-primary)]"
                            : "text-[var(--zen-on-surface-variant)]"
                    }`}
                >
                    2D
                </button>
                <button
                    type="button"
                    onClick={() => setMode("3d")}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        mode === "3d"
                            ? "bg-[var(--zen-primary)] text-[var(--zen-on-primary)]"
                            : "text-[var(--zen-on-surface-variant)]"
                    }`}
                >
                    3D
                </button>
            </div>

            {/* Stats badge */}
            <div className="absolute top-4 right-4 z-10 bg-[var(--zen-surface-lowest)] rounded-full px-4 py-1.5 border border-[var(--zen-outline-variant)] border-dashed text-xs text-[var(--zen-on-surface-variant)]">
                {graphData.nodes.length} notes ·{" "}
                {graphData.links.length} links
            </div>

            {mode === "2d" ? (
                <ForceGraph2D
                    ref={fgRef}
                    graphData={graphData}
                    width={dims.width}
                    height={dims.height}
                    backgroundColor={colors.background}
                    nodeColor={() => colors.node}
                    linkColor={() => colors.link}
                    linkWidth={1}
                    linkDirectionalArrowLength={4}
                    linkDirectionalArrowRelPos={1}
                    linkCurvature={0.1}
                    cooldownTicks={100}
                    onNodeClick={handleNodeClick}
                    nodeCanvasObject={paint2DNode}
                    nodeCanvasObjectMode={() => "replace"}
                    enableNodeDrag
                />
            ) : (
                <ForceGraph3D
                    ref={fgRef}
                    graphData={graphData}
                    width={dims.width}
                    height={dims.height}
                    backgroundColor={colors.background}
                    nodeColor={() => colors.node}
                    nodeRelSize={5}
                    linkColor={() => colors.link}
                    linkWidth={1}
                    linkDirectionalArrowLength={4}
                    linkDirectionalArrowRelPos={1}
                    linkCurvature={0.1}
                    cooldownTicks={100}
                    onNodeClick={handleNodeClick}
                    nodeThreeObject={threeNodeObject}
                    nodeThreeObjectExtend
                />
            )}
        </div>
    );
}
