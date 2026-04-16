"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import EditorToolbar from "./EditorToolbar";
import {
    Bold,
    Italic,
    Heading2,
    Code,
    Quote,
    List,
    ListOrdered,
    Strikethrough,
} from "lucide-react";
import type { ReactNode } from "react";

type ZenEditorProps = {
    initialContent?: string;
    onUpdate?: (markdown: string) => void;
    placeholder?: string;
};

type ToolbarAction = {
    icon: ReactNode;
    action: () => void;
    isActive: () => boolean;
    label: string;
};

export default function ZenEditor({
    initialContent = "",
    onUpdate,
    placeholder = "Start writing here...",
}: ZenEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Markdown.configure({
                html: true,
                breaks: true,
                transformPastedText: true,
                transformCopiedText: true,
            }),
            Placeholder.configure({
                placeholder,
            }),
        ],
        content: initialContent,
        contentType: "markdown",
        editorProps: {
            attributes: {
                class: "tiptap focus:outline-none",
            },
        },
        onUpdate: ({ editor: e }) => {
            if (onUpdate) {
                onUpdate(e.storage.markdown.getMarkdown());
            }
        },
        immediatelyRender: false,
    });

    if (!editor) return null;

    const actions: ToolbarAction[] = [
        {
            icon: <Bold size={14} />,
            action: () => editor.chain().focus().toggleBold().run(),
            isActive: () => editor.isActive("bold"),
            label: "Bold",
        },
        {
            icon: <Italic size={14} />,
            action: () => editor.chain().focus().toggleItalic().run(),
            isActive: () => editor.isActive("italic"),
            label: "Italic",
        },
        {
            icon: <Strikethrough size={14} />,
            action: () => editor.chain().focus().toggleStrike().run(),
            isActive: () => editor.isActive("strike"),
            label: "Strikethrough",
        },
        {
            icon: <Heading2 size={14} />,
            action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            isActive: () => editor.isActive("heading", { level: 2 }),
            label: "Heading",
        },
        {
            icon: <Quote size={14} />,
            action: () => editor.chain().focus().toggleBlockquote().run(),
            isActive: () => editor.isActive("blockquote"),
            label: "Quote",
        },
        {
            icon: <Code size={14} />,
            action: () => editor.chain().focus().toggleCodeBlock().run(),
            isActive: () => editor.isActive("codeBlock"),
            label: "Code",
        },
        {
            icon: <List size={14} />,
            action: () => editor.chain().focus().toggleBulletList().run(),
            isActive: () => editor.isActive("bulletList"),
            label: "Bullet List",
        },
        {
            icon: <ListOrdered size={14} />,
            action: () => editor.chain().focus().toggleOrderedList().run(),
            isActive: () => editor.isActive("orderedList"),
            label: "Ordered List",
        },
    ];

    return (
        <div className="relative">
            <EditorToolbar editor={editor} actions={actions} />
            <EditorContent editor={editor} />
        </div>
    );
}
