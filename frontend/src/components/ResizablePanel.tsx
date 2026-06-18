"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type ResizablePanelProps = {
  /** Storage key for persisting width in localStorage */
  storageKey?: string;
  /** Default width in pixels */
  defaultWidth: number;
  /** Minimum width in pixels (default 200) */
  minWidth?: number;
  /** Maximum width in pixels (default 600) */
  maxWidth?: number;
  /** Side the drag handle is on: "right" = drag right edge, "left" = drag left edge */
  handleSide?: "left" | "right";
  /** Controlled collapsed state (0 width when collapsed) */
  isCollapsed?: boolean;
  /** Content */
  children: ReactNode;
  /** Additional className */
  className?: string;
};

/**
 * A panel with a draggable resize handle.
 *
 * Width persists to localStorage per storageKey.
 * On mobile (< 768px), the panel should be rendered as overlay by the parent
 * — this component only handles desktop resizing.
 */
export default function ResizablePanel({
  storageKey,
  defaultWidth,
  minWidth = 180,
  maxWidth = 600,
  handleSide = "right",
  isCollapsed = false,
  children,
  className = "",
}: ResizablePanelProps) {
  const [width, setWidth] = useState(() => {
    if (storageKey && typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          return parsed;
        }
      }
    }
    return defaultWidth;
  });

  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isCollapsed) return;
      e.preventDefault();
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width, isCollapsed],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      // For handleSide="right": dragging right increases width
      // For handleSide="left": dragging right decreases width
      const newWidth =
        handleSide === "right" ? startWidth.current + delta : startWidth.current - delta;
      const clamped = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(clamped);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Persist to localStorage
      if (storageKey) {
        localStorage.setItem(storageKey, String(width));
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [storageKey, width, minWidth, maxWidth, handleSide]);

  // Persist width when it changes (during drag, via the effect above's mouseup)
  useEffect(() => {
    if (storageKey && !isDragging.current) {
      localStorage.setItem(storageKey, String(width));
    }
  }, [width, storageKey]);

  const effectiveWidth = isCollapsed ? 0 : width;
  const handleElement = (
    <div
      onMouseDown={handleMouseDown}
      className={`group absolute top-0 ${
        handleSide === "right" ? "right-0" : "left-0"
      } h-full w-1 cursor-col-resize z-20 flex items-center justify-center transition-colors ${
        isCollapsed ? "pointer-events-none" : ""
      }`}
    >
      <div className="h-full w-px bg-[var(--zen-outline-variant)] opacity-40 group-hover:opacity-100 group-hover:w-0.5 transition-all" />
    </div>
  );

  if (isCollapsed) return null;

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: effectiveWidth }}>
      {handleSide === "left" && handleElement}
      {children}
      {handleSide === "right" && handleElement}
    </div>
  );
}
