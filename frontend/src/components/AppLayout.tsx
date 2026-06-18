"use client";

import { type ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Navbar from "@/components/Navbar";
import NoteSidebar from "@/components/NoteSidebar";
import ResizablePanel from "@/components/ResizablePanel";
import AiPanel from "@/components/AiPanel";
import { useChatPanel } from "@/context/ChatPanelContext";
import { NotesProvider } from "@/context/NotesContext";
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
 * │  Navbar                                              │
 * ├──────┬───────────┬──────────────────────┬────────────┤
 * │ App  │  Note     │  Content (children)  │  AI Chat   │
 * │ Side │  Sidebar  │                      │            │
 * │      │  (resize) │                      │  (resize)  │
 * └──────┴───────────┴──────────────────────┴────────────┘
 *
 * Mobile layout:
 * - App sidebar: collapsible overlay (shadcn default)
 * - Note sidebar: hidden (accessible via navbar button — TODO)
 * - AI panel: overlay
 * - Content: full width
 */
export default function AppLayout({ children }: AppLayoutProps) {
  const signedIn = useRequireAuth();
  const { isOpen: isChatOpen } = useChatPanel();
  const isMobile = useIsMobile();

  if (!signedIn) return null;

  return (
    <NotesProvider>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden">
          {/* App sidebar (icon-collapsible, shadcn default) */}
          <AppSidebar />

          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Navbar />

            <div className="flex-1 flex overflow-hidden">
              {/* Note sidebar — only on desktop, resizable */}
              {!isMobile && (
                <ResizablePanel
                  storageKey="note-sidebar-width"
                  defaultWidth={220}
                  minWidth={160}
                  maxWidth={400}
                  handleSide="right"
                >
                  <NoteSidebar />
                </ResizablePanel>
              )}

              {/* Page content */}
              <div className="flex-1 overflow-y-auto">{children}</div>

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
        </div>

        {/* Mobile: AI panel renders as overlay */}
        {isMobile && <AiPanel />}
      </SidebarProvider>
    </NotesProvider>
  );
}
