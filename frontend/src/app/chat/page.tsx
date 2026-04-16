"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChatPanel } from "@/context/ChatPanelContext";

export default function ChatRedirect() {
    const router = useRouter();
    const { openPanel } = useChatPanel();

    useEffect(() => {
        openPanel();
        router.replace("/");
    }, [openPanel, router]);

    return null;
}
