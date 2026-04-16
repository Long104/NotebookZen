"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { type Editor } from "@tiptap/react";

type ToolbarAction = {
    icon: ReactNode;
    action: () => void;
    isActive: () => boolean;
    label: string;
};

type EditorToolbarProps = {
    editor: Editor;
    actions: ToolbarAction[];
};

export default function EditorToolbar({ editor, actions }: EditorToolbarProps) {
    const [show, setShow] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const toolbarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updatePosition = () => {
            const { from, to } = editor.state.selection;
            if (from === to) {
                setShow(false);
                return;
            }

            const view = editor.view;
            const start = view.coordsAtPos(from);
            const end = view.coordsAtPos(to);
            const editorBox = view.dom.parentElement?.getBoundingClientRect();

            if (!editorBox) return;

            const top = start.top - editorBox.top - 48;
            const left = (start.left + end.left) / 2 - editorBox.left;

            setCoords({ top, left });
            setShow(true);
        };

        editor.on("selectionUpdate", updatePosition);
        editor.on("blur", () => setShow(false));

        return () => {
            editor.off("selectionUpdate", updatePosition);
        };
    }, [editor]);

    if (!show) return null;

    return (
        <div
            ref={toolbarRef}
            className="bubble-menu absolute z-50"
            style={{
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                transform: "translateX(-50%)",
            }}
        >
            {actions.map((action) => (
                <button
                    key={action.label}
                    onClick={(e) => {
                        e.preventDefault();
                        action.action();
                    }}
                    className={action.isActive() ? "is-active" : ""}
                    title={action.label}
                    type="button"
                >
                    {action.icon}
                </button>
            ))}
        </div>
    );
}
