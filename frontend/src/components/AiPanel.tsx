"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChatPanel } from "@/context/ChatPanelContext";
import { useNotes } from "@/context/NotesContext";
import { useIsMobile } from "@/hooks/use-mobile";
import Link from "next/link";
import { X, Send, Loader2, Trash2 } from "lucide-react";

export default function AiPanel() {
  const { isOpen, messages, isLoading, error, closePanel, sendMessage, clearChat, openPanel } =
    useChatPanel();
  const { notes } = useNotes();
  const isMobile = useIsMobile();
  const [input, setInput] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextNoteIds, setContextNoteIds] = useState<number[]>([]);
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

  // Handle drag-and-drop from note sidebar
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const noteId = e.dataTransfer.getData("text/note-id");
    if (noteId) {
      const note = notes.find((n) => n.id === Number(noteId));
      if (note) {
        const snippet = note.content ? note.content.slice(0, 300) : "(empty)";
        setInput(`about "${note.title}": ${snippet} — `);
        setContextNoteIds((prev) => (prev.includes(note.id) ? prev : [...prev, note.id]));
        if (!isOpen) openPanel();
        setTimeout(() => inputRef.current?.focus(), 350);
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    const ids = contextNoteIds.length > 0 ? [...contextNoteIds] : undefined;
    setInput("");
    setContextNoteIds([]);
    await sendMessage(text, ids);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      closePanel();
    }
  }

  // --- Mobile: overlay mode (same as before) ---
  if (isMobile) {
    return (
      <>
        <div
          className={`fixed inset-0 bg-black/10 z-40 transition-opacity duration-300 ${
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={closePanel}
        />
        <aside
          className={`fixed top-0 right-0 h-full w-[380px] max-w-[calc(100vw-3rem)] z-50 flex flex-col
                        bg-[var(--zen-surface-low)] border-l border-dashed border-[var(--zen-outline-variant)]
                        transition-all duration-300 ease-in-out
                        ${isOpen ? "translate-x-0" : "translate-x-full"}
                        ${
                          isDragOver
                            ? "ring-2 ring-[var(--zen-primary)] bg-[var(--zen-primary-container)]/20"
                            : ""
                        }`}
          onKeyDown={handleKeyDown}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <PanelContent
            messages={messages}
            isLoading={isLoading}
            error={error}
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            onClose={closePanel}
            onClear={clearChat}
            inputRef={inputRef}
            messagesEndRef={messagesEndRef}
          />
        </aside>
      </>
    );
  }

  // --- Desktop: inline sidebar mode ---
  // When closed on desktop, panel collapses to 0 width (handled by parent layout)
  if (!isOpen) return null;

  return (
    <aside
      className={`h-full w-full flex flex-col bg-[var(--zen-surface-low)] border-l border-dashed border-[var(--zen-outline-variant)] transition-all ${
        isDragOver ? "ring-2 ring-[var(--zen-primary)] bg-[var(--zen-primary-container)]/20" : ""
      }`}
      onKeyDown={handleKeyDown}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <PanelContent
        messages={messages}
        isLoading={isLoading}
        error={error}
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        onClose={closePanel}
        onClear={clearChat}
        inputRef={inputRef}
        messagesEndRef={messagesEndRef}
      />
    </aside>
  );
}

// --- Shared content for both mobile and desktop ---
function PanelContent({
  messages,
  isLoading,
  error,
  input,
  setInput,
  onSubmit,
  onClose,
  onClear,
  inputRef,
  messagesEndRef,
}: {
  messages: ReturnType<typeof useChatPanel>["messages"];
  isLoading: boolean;
  error: string;
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[var(--zen-primary)] flex items-center justify-center">
            <svg
              width="12"
              height="12"
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
            <div className="text-xs font-medium">ZenNote AI</div>
            <div className="text-[9px] text-[var(--zen-on-surface-variant)] tracking-wide uppercase">
              Ask about your notes
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {messages.length > 0 && (
            <button onClick={onClear} className="zen-btn-ghost p-1.5" title="Clear chat">
              <Trash2 size={12} />
            </button>
          )}
          <button onClick={onClose} className="zen-btn-ghost p-1.5" title="Close panel">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col gap-2 h-full justify-center items-center text-center px-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--zen-primary-container)] flex items-center justify-center mb-1">
              <svg
                width="20"
                height="20"
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
            <div className="text-xs font-medium">Ask anything about your notes</div>
            <div className="text-[11px] text-[var(--zen-on-surface-variant)] leading-relaxed max-w-[220px]">
              ZenNote AI searches your notes and cites sources. Drag a note here for context.
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-[var(--zen-primary)] text-[var(--zen-on-primary)]"
                  : "bg-[var(--zen-surface-lowest)]"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 outline outline-1 outline-dashed outline-[var(--zen-outline-variant)] -outline-offset-1 rounded-lg p-1.5">
                  <div className="text-[9px] text-[var(--zen-on-surface-variant)] mb-1 uppercase tracking-wider">
                    Sources
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {msg.sources.map((source) => (
                      <Link
                        key={source.id}
                        href={`/realShowList?noteId=${source.id}`}
                        onClick={onClose}
                        className="text-[10px] bg-[var(--zen-primary-container)] text-[var(--zen-on-primary-container)] px-1.5 py-0.5 rounded-md outline outline-1 outline-dashed outline-[var(--zen-outline-variant)]"
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
            <div className="bg-[var(--zen-surface-lowest)] rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-[var(--zen-on-surface-variant)]">
              <Loader2 size={12} className="animate-spin" />
              Thinking...
            </div>
          </div>
        )}

        {error && <div className="text-[11px] text-[var(--zen-error)] text-center">{error}</div>}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-dashed border-[var(--zen-outline-variant)]">
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your notes..."
            className="flex-1 px-3 py-2 bg-[var(--zen-surface-lowest)] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[var(--zen-outline-variant)] focus:ring-dashed transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="zen-btn-primary p-2 disabled:opacity-50"
            disabled={isLoading || !input.trim()}
          >
            <Send size={12} />
          </button>
        </form>
      </div>
    </>
  );
}
