"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  Suspense,
  type ReactNode,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useNotes } from "@/context/NotesContext";

export type TabItem = {
  id: string; // full path (path + query), e.g. "/dashboard", "/realShowList?noteId=3"
  title: string;
  path: string;
};

type TabsContextType = {
  tabs: TabItem[];
  activeTabId: string | null;
  openTab: (path: string, title: string) => void;
  closeTab: (id: string, e?: React.MouseEvent) => void;
  setActiveTab: (id: string) => void;
};

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export function TabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const router = useRouter();

  const openTab = useCallback((path: string, title: string) => {
    setTabs((prev) => {
      const exists = prev.find((t) => t.id === path);
      if (exists) {
        if (exists.title !== title) {
          return prev.map((t) => (t.id === path ? { ...t, title } : t));
        }
        return prev;
      }
      return [...prev, { id: path, title, path }];
    });
    setActiveTabId(path);
  }, []);

  const closeTab = useCallback(
    (id: string, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }

      const index = tabs.findIndex((t) => t.id === id);
      if (index === -1) return;

      const nextTabs = tabs.filter((t) => t.id !== id);
      setTabs(nextTabs);

      if (activeTabId === id) {
        if (nextTabs.length > 0) {
          const nextActiveIndex = Math.min(index, nextTabs.length - 1);
          const nextActive = nextTabs[nextActiveIndex];
          setActiveTabId(nextActive.id);
          router.push(nextActive.path);
        } else {
          setActiveTabId(null);
          router.push("/dashboard");
        }
      }
    },
    [tabs, activeTabId, router],
  );

  const setActiveTab = useCallback(
    (id: string) => {
      setActiveTabId(id);
      const tab = tabs.find((t) => t.id === id);
      if (tab) {
        router.push(tab.path);
      }
    },
    [tabs, router],
  );

  return (
    <TabsContext.Provider value={{ tabs, activeTabId, openTab, closeTab, setActiveTab }}>
      {children}
      <Suspense fallback={null}>
        <TabObserver />
      </Suspense>
    </TabsContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("useTabs must be used within TabsProvider");
  return context;
}

function TabObserver() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { notes } = useNotes();
  const { openTab } = useTabs();

  useEffect(() => {
    if (!pathname) return;

    // Ignore sign-in/up and landing pages
    if (pathname === "/" || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
      return;
    }

    const searchStr = searchParams ? searchParams.toString() : "";
    const fullPath = searchStr ? `${pathname}?${searchStr}` : pathname;

    let title = "ZenNote";
    if (pathname === "/dashboard") {
      title = "Home";
    } else if (pathname === "/graph") {
      title = "Note Graph";
    } else if (pathname === "/create") {
      title = "Create Note";
    } else if (pathname === "/settings") {
      title = "Settings";
    } else if (pathname === "/realShowList") {
      const noteId = searchParams ? searchParams.get("noteId") : null;
      if (noteId) {
        const note = notes.find((n) => n.id === Number(noteId));
        title = note ? note.title : "Loading Note...";
      } else {
        title = "My Notes";
      }
    }

    openTab(fullPath, title);
  }, [pathname, searchParams, notes, openTab]);

  return null;
}
