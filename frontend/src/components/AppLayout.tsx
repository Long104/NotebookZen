"use client";

import { type ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import Navbar from "@/components/Navbar";
import ResizablePanel from "@/components/ResizablePanel";
import AiPanel from "@/components/AiPanel";
import { useChatPanel } from "@/context/ChatPanelContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useIsMobile } from "@/hooks/use-mobile";

type AppLayoutProps = {
  children: ReactNode;
};

/**
 * AppLayout — the persistent multi-panel layout shared by every authenticated page.
 *
 * Desktop layout:
 * ┌──────────────────────────────────────────────────────┐
 * │  Navbar (Redesigned with tabs)                       │
 * ├──────┬──────────────────────────────────┬────────────┤
 * │ App  │  Content (children)              │  AI Chat   │
 * │ Side │                                  │            │
 * │      │                                  │  (resize)  │
 * └──────┴──────────────────────────────────┴────────────┘
 */
export default function AppLayout({ children }: AppLayoutProps) {
  const signedIn = useRequireAuth();
  const { isOpen: isChatOpen } = useChatPanel();
  const isMobile = useIsMobile();

  if (!signedIn) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* App sidebar (icon-collapsible, shadcn default) */}
      <AppSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <div className="flex-1 flex overflow-hidden">
          {/* Page content */}
          <div className="flex-1 overflow-y-auto bg-[var(--zen-surface)]">{children}</div>

          {/* AI panel — resizable on desktop, overlay on mobile */}
          {!isMobile && (
            <ResizablePanel
              storageKey="ai-panel-width"
              defaultWidth={320}
              minWidth={260}
              maxWidth={500}
              handleSide="left"
              isCollapsed={!isChatOpen}
            >
              <AiPanel />
            </ResizablePanel>
          )}
        </div>
      </div>

      {/* Mobile: AI panel renders as overlay */}
      {isMobile && <AiPanel />}
    </div>
  );
}
