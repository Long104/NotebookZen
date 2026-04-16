"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { useEffect } from "react";

type MarkdownRendererProps = {
    content: string;
};

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Markdown.configure({
                html: true,
                breaks: true,
            }),
        ],
        content: content || "",
        contentType: "markdown",
        editable: false,
        editorProps: {
            attributes: {
                class: "tiptap",
            },
        },
        immediatelyRender: false,
    });

    useEffect(() => {
        if (editor && content !== undefined) {
            editor.commands.setContent(content || "");
        }
    }, [content, editor]);

    if (!editor) return null;

    return <EditorContent editor={editor} />;
}
