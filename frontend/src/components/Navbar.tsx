"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { useChatPanel } from "@/context/ChatPanelContext";
import { useTabs } from "@/context/TabsContext";
import {
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Home,
  Share2,
  PenLine,
  Settings,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { isOpen, togglePanel } = useChatPanel();
  const { isSignedIn } = useUser();
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabs();
  const router = useRouter();

  // Helper to render icon based on path
  const getTabIcon = (path: string) => {
    if (path.startsWith("/dashboard")) return <Home size={12} />;
    if (path.startsWith("/graph")) return <Share2 size={12} />;
    if (path.startsWith("/create")) return <PenLine size={12} />;
    if (path.startsWith("/settings")) return <Settings size={12} />;
    return <FileText size={12} />;
  };

  const handleBack = () => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  const handleForward = () => {
    if (typeof window !== "undefined") {
      window.history.forward();
    }
  };

  const handleNewTab = () => {
    router.push("/create");
  };

  return (
    <div className="flex items-center h-16 px-4 bg-[var(--zen-surface-low)] shrink-0 select-none">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleBack}
            className="p-1.5 hover:bg-[var(--zen-surface-high)] rounded-md text-[var(--zen-on-surface-variant)] transition-colors"
            title="Go back"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleForward}
            className="p-1.5 hover:bg-[var(--zen-surface-high)] rounded-md text-[var(--zen-on-surface-variant)] transition-colors"
            title="Go forward"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Tabs List */}
      <div className="flex-1 flex items-center gap-1.5 px-4 overflow-x-auto scrollbar-none h-full">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs cursor-pointer transition-all duration-200 group shrink-0 border ${
                isActive
                  ? "bg-[var(--zen-surface-lowest)] text-[var(--zen-on-surface)] font-medium border-dashed border-[var(--zen-outline-variant)]"
                  : "text-[var(--zen-on-surface-variant)] hover:bg-[var(--zen-surface-high)]/40 border-transparent"
              }`}
            >
              {getTabIcon(tab.path)}
              <span className="max-w-[120px] truncate">{tab.title}</span>
              <button
                onClick={(e) => closeTab(tab.id, e)}
                className={`p-0.5 rounded-full transition-all text-[var(--zen-on-surface-variant)] hover:bg-[var(--zen-surface-high)] hover:text-[var(--zen-on-surface)] ${
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
                title="Close tab"
              >
                <X size={10} />
              </button>
            </div>
          );
        })}
        <button
          onClick={handleNewTab}
          className="p-1.5 hover:bg-[var(--zen-surface-high)] rounded-full text-[var(--zen-on-surface-variant)] transition-colors shrink-0"
          title="New tab/note"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          onClick={togglePanel}
          className={`zen-btn-ghost p-2 transition-colors duration-300 ${
            isOpen ? "text-[var(--zen-primary)] bg-[var(--zen-primary-container)]" : ""
          }`}
          title="Toggle AI Chat"
        >
          <MessageSquare size={16} />
        </button>
      </div>
    </div>
  );
}
