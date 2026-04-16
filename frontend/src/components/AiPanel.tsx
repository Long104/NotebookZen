"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChatPanel } from "@/context/ChatPanelContext";
import Link from "next/link";
import { X, Send, Loader2, Trash2 } from "lucide-react";

export default function AiPanel() {
    const {
        isOpen,
        messages,
        isLoading,
        error,
        closePanel,
        sendMessage,
        clearChat,
    } = useChatPanel();
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 350);
        }
    }, [isOpen]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const text = input;
        setInput("");
        await sendMessage(text);
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Escape") {
            closePanel();
        }
    }

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/10 z-40 transition-opacity duration-300 ${
                    isOpen
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                }`}
                onClick={closePanel}
            />

            <aside
                className={`fixed top-0 right-0 h-full w-[380px] max-w-[calc(100vw-3rem)] z-50 flex flex-col
                    bg-[var(--zen-surface-low)] border-l border-dashed border-[var(--zen-outline-variant)]
                    transition-transform duration-300 ease-in-out
                    ${isOpen ? "translate-x-0" : "translate-x-full"}`}
                onKeyDown={handleKeyDown}
            >
                <div className="flex items-center justify-between px-5 h-16 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[var(--zen-primary)] flex items-center justify-center">
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="var(--zen-on-primary)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                                <line x1="9" y1="21" x2="15" y2="21" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-sm font-medium">
                                ZenNote AI
                            </div>
                            <div className="text-[10px] text-[var(--zen-on-surface-variant)] tracking-wide uppercase">
                                Ask about your notes
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {messages.length > 0 && (
                            <button
                                onClick={clearChat}
                                className="zen-btn-ghost p-2 text-xs"
                                title="Clear chat"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                        <button
                            onClick={closePanel}
                            className="zen-btn-ghost p-2"
                            title="Close panel"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                    {messages.length === 0 && (
                        <div className="flex flex-col gap-3 h-full justify-center items-center text-center px-4">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--zen-primary-container)] flex items-center justify-center mb-2">
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="var(--zen-on-primary-container)"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                            </div>
                            <div className="text-sm font-medium">
                                Ask anything about your notes
                            </div>
                            <div className="text-xs text-[var(--zen-on-surface-variant)] leading-relaxed max-w-[260px]">
                                ZenNote AI will search through your notes and
                                cite sources for every answer.
                            </div>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                                    msg.role === "user"
                                        ? "bg-[var(--zen-primary)] text-[var(--zen-on-primary)]"
                                        : "bg-[var(--zen-surface-lowest)]"
                                }`}
                            >
                                <div className="whitespace-pre-wrap">
                                    {msg.content}
                                </div>
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-2.5 pt-2.5 outline outline-1 outline-dashed outline-[var(--zen-outline-variant)] -outline-offset-1 rounded-lg p-2">
                                        <div className="text-[10px] text-[var(--zen-on-surface-variant)] mb-1.5 uppercase tracking-wider">
                                            Sources
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {msg.sources.map((source) => (
                                                <Link
                                                    key={source.id}
                                                    href={`/realShowList?noteId=${source.id}`}
                                                    onClick={closePanel}
                                                    className="text-[11px] bg-[var(--zen-primary-container)] text-[var(--zen-on-primary-container)] px-2 py-0.5 rounded-md outline outline-1 outline-dashed outline-[var(--zen-outline-variant)]"
                                                >
                                                    {source.title}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-[var(--zen-surface-lowest)] rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-[var(--zen-on-surface-variant)]">
                                <Loader2 size={14} className="animate-spin" />
                                Thinking...
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-xs text-[var(--zen-error)] text-center">
                            {error}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <div className="shrink-0 p-4 border-t border-dashed border-[var(--zen-outline-variant)]">
                    <form
                        onSubmit={handleSubmit}
                        className="flex gap-2"
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about your notes..."
                            className="flex-1 px-3.5 py-2 bg-[var(--zen-surface-lowest)] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[var(--zen-outline-variant)] focus:ring-dashed transition-all duration-300"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className="zen-btn-primary p-2 disabled:opacity-50"
                            disabled={isLoading || !input.trim()}
                        >
                            <Send size={14} />
                        </button>
                    </form>
                </div>
            </aside>
        </>
    );
}
