"use client";

import Image from "next/image";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { useChatPanel } from "@/context/ChatPanelContext";
import { MessageSquare } from "lucide-react";

export default function Navbar() {
    const { isOpen, togglePanel } = useChatPanel();
    const { isSignedIn } = useUser();

    return (
        <div className="flex items-center h-16 px-4">
            <SidebarTrigger />
            <nav className="flex-1 flex justify-between items-center px-4">
                <div className="flex items-center gap-3">
                    <Image
                        src="/zenLogo2.png"
                        alt="Logo"
                        width={32}
                        height={32}
                        className="rounded-full"
                    />
                    <span className="text-sm font-medium tracking-wide hidden sm:block">
                        ZenNote
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <button
                        onClick={togglePanel}
                        className={`zen-btn-ghost p-2 transition-colors duration-300 ${
                            isOpen
                                ? "text-[var(--zen-primary)] bg-[var(--zen-primary-container)]"
                                : ""
                        }`}
                        title="Toggle AI Chat"
                    >
                        <MessageSquare size={16} />
                    </button>
                    {!isSignedIn && (
                        <SignInButton mode="modal" redirectTo="/dashboard">
                            <button className="zen-btn-primary text-xs">
                                Sign In
                            </button>
                        </SignInButton>
                    )}
                    {isSignedIn && <UserButton afterSignOutUrl="/" />}
                </div>
            </nav>
        </div>
    );
}
