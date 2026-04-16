"use client";

import {
    createContext,
    useContext,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";

type Source = {
    id: number;
    title: string;
    createdAt: string;
};

type Message = {
    id: number;
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
};

type ChatPanelContextValue = {
    isOpen: boolean;
    messages: Message[];
    isLoading: boolean;
    error: string;
    togglePanel: () => void;
    openPanel: () => void;
    closePanel: () => void;
    sendMessage: (text: string) => Promise<void>;
    clearChat: () => void;
};

const ChatPanelContext = createContext<ChatPanelContextValue | undefined>(
    undefined,
);

let messageIdCounter = 0;

export function ChatPanelProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const { getToken } = useAuth();

    const togglePanel = useCallback(() => setIsOpen((prev) => !prev), []);
    const openPanel = useCallback(() => setIsOpen(true), []);
    const closePanel = useCallback(() => setIsOpen(false), []);

    const clearChat = useCallback(() => {
        setMessages([]);
        setError("");
    }, []);

    const sendMessage = useCallback(
        async (text: string) => {
            if (!text.trim() || isLoading) return;
            const token = await getToken();
            if (!token) {
                setError("You must be signed in to use AI chat.");
                return;
            }

            const userMessage: Message = {
                id: ++messageIdCounter,
                role: "user",
                content: text.trim(),
            };
            setMessages((prev) => [...prev, userMessage]);
            setError("");
            setIsLoading(true);

            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ question: userMessage.content }),
                    },
                );

                if (!response.ok) throw new Error("Failed to get response");

                const data = await response.json();
                const assistantMessage: Message = {
                    id: ++messageIdCounter,
                    role: "assistant",
                    content: data.answer,
                    sources: data.sources,
                };
                setMessages((prev) => [...prev, assistantMessage]);
            } catch {
                setError("Something went wrong. Please try again.");
                setMessages((prev) => [
                    ...prev,
                    {
                        id: ++messageIdCounter,
                        role: "assistant" as const,
                        content:
                            "Sorry, something went wrong. Please try again.",
                    },
                ]);
            } finally {
                setIsLoading(false);
            }
        },
        [getToken, isLoading],
    );

    return (
        <ChatPanelContext.Provider
            value={{
                isOpen,
                messages,
                isLoading,
                error,
                togglePanel,
                openPanel,
                closePanel,
                sendMessage,
                clearChat,
            }}
        >
            {children}
        </ChatPanelContext.Provider>
    );
}

export function useChatPanel() {
    const ctx = useContext(ChatPanelContext);
    if (!ctx)
        throw new Error("useChatPanel must be used within ChatPanelProvider");
    return ctx;
}
