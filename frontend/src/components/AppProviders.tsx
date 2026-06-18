"use client";

import { type ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme";
import { ChatPanelProvider } from "@/context/ChatPanelContext";
import { NotesProvider } from "@/context/NotesContext";
import { TabsProvider } from "@/context/TabsContext";
import { SidebarProvider } from "@/components/ui/sidebar";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <NotesProvider>
        <ChatPanelProvider>
          <TabsProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </TabsProvider>
        </ChatPanelProvider>
      </NotesProvider>
    </ThemeProvider>
  );
}
