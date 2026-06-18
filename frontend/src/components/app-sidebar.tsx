"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Home,
  PenLine,
  Share2,
  MessageSquare,
  Settings,
  Plus,
  Folder as FolderIcon,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Trash2,
  Loader2,
} from "lucide-react";
import { useChatPanel } from "@/context/ChatPanelContext";
import { useNotes } from "@/context/NotesContext";

export function AppSidebar() {
  const { user } = useUser();
  const { openPanel } = useChatPanel();
  const router = useRouter();

  const {
    notes,
    folders,
    selectedNote,
    fetchNotes,
    fetchFolders,
    createNote,
    createFolder,
    deleteFolder,
    moveNote,
    isLoading,
  } = useNotes();

  const [expandedFolders, setExpandedFolders] = useState<Set<number | "all">>(new Set(["all"]));
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState<number | "all" | null>(null);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sidebar-width");
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 180 && parsed <= 400) {
          return parsed;
        }
      }
    }
    return 240;
  });

  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    if (typeof window !== "undefined") {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.body.setAttribute("data-sidebar-dragging", "true");
    }
  };

  useEffect(() => {
    const wrapper = document.querySelector('[data-slot="sidebar-wrapper"]') as HTMLElement;
    if (wrapper) {
      wrapper.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
    }
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;
      if (newWidth >= 180 && newWidth <= 400) {
        setSidebarWidth(newWidth);
        localStorage.setItem("sidebar-width", String(newWidth));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (typeof window !== "undefined") {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.body.removeAttribute("data-sidebar-dragging");
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    fetchNotes();
    fetchFolders();
  }, [fetchNotes, fetchFolders]);

  const toggleFolder = (id: number | "all") => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Create folder
  async function handleCreateFolder(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const name = prompt("Folder name:");
    if (name?.trim()) {
      await createFolder(name.trim());
    }
  }

  // Create note inside a specific folder (or general)
  async function handleCreateNoteInFolder(e: React.MouseEvent, folderId: number | null) {
    e.stopPropagation();
    e.preventDefault();
    setIsCreatingNote(true);
    const note = await createNote("Untitled Note", "", folderId);
    setIsCreatingNote(false);
    if (note) {
      router.push(`/realShowList?noteId=${note.id}`);
    }
  }

  // Delete folder
  async function handleDeleteFolder(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Delete this notebook? Notes will become uncategorized.")) return;
    await deleteFolder(id);
  }

  // Drag & drop note handlers
  function handleNoteDragStart(e: React.DragEvent, noteId: number) {
    e.dataTransfer.setData("text/note-id", String(noteId));
    e.dataTransfer.effectAllowed = "move";
  }

  function handleFolderDrop(e: React.DragEvent, folderId: number | "all" | null) {
    e.preventDefault();
    setDragOverFolderId(null);
    const noteId = Number(e.dataTransfer.getData("text/note-id"));
    if (noteId) {
      moveNote(noteId, folderId === "all" ? null : folderId);
    }
  }

  function handleFolderDragOver(e: React.DragEvent, folderId: number | "all" | null) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolderId(folderId);
  }

  function handleFolderDragLeave() {
    setDragOverFolderId(null);
  }

  const uncategorizedNotes = notes.filter((n) => !n.folderId);

  return (
    <Sidebar
      collapsible="offcanvas"
      style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
      className="font-sans"
    >
      {/* Draggable resize handle on the right edge */}
      <div
        onMouseDown={handleMouseDown}
        className="group absolute top-0 right-0 h-full w-1.5 cursor-col-resize z-50 flex items-center justify-center transition-colors"
      >
        <div className="h-full w-px bg-[var(--zen-border)] opacity-60 group-hover:opacity-100 group-hover:bg-[var(--zen-primary)] group-hover:w-0.5 transition-all" />
      </div>

      {/* Sidebar Header — User switcher and settings gear at the top */}
      <SidebarHeader className="px-4 h-16 flex flex-row items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <UserButton />
          <span className="text-xs font-semibold truncate max-w-[120px] text-[var(--zen-on-surface)]">
            {user?.fullName || user?.primaryEmailAddress?.emailAddress || "Workspace"}
          </span>
        </div>
        <Link
          href="/settings"
          className="p-1.5 hover:bg-[var(--zen-surface-high)] rounded-md text-[var(--zen-on-surface-variant)] transition-colors shrink-0"
          title="Settings"
        >
          <Settings size={14} />
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 flex flex-col gap-4">
        {/* Core Navigation Group */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-2 text-[10px] tracking-wider uppercase text-[var(--zen-on-surface-variant)] opacity-60">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Home">
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <Home size={14} />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Mapping">
                  <Link href="/graph" className="flex items-center gap-2">
                    <Share2 size={14} />
                    <span>Mapping</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton tooltip="AI Chat" onClick={openPanel}>
                  <div className="flex items-center gap-2">
                    <MessageSquare size={14} />
                    <span>AI Chat</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Notebooks & Notes Group */}
        <SidebarGroup className="p-0 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-2 mb-1.5 shrink-0">
            <SidebarGroupLabel className="p-0 text-[10px] tracking-wider uppercase text-[var(--zen-on-surface-variant)] opacity-60">
              Notebooks
            </SidebarGroupLabel>
            <button
              onClick={handleCreateFolder}
              className="p-1 hover:bg-[var(--zen-surface-high)] rounded text-[var(--zen-on-surface-variant)] transition-colors"
              title="Create Notebook"
            >
              <Plus size={12} />
            </button>
          </div>

          <SidebarGroupContent className="flex-1 overflow-y-auto pr-1">
            <SidebarMenu>
              {/* All Notes / Uncategorized section */}
              <SidebarMenuItem className="mb-1">
                <div
                  onDrop={(e) => handleFolderDrop(e, "all")}
                  onDragOver={(e) => handleFolderDragOver(e, "all")}
                  onDragLeave={handleFolderDragLeave}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm font-normal cursor-pointer transition-colors hover:bg-[var(--zen-surface-high)] ${
                    dragOverFolderId === "all"
                      ? "ring-1 ring-[var(--zen-primary)] bg-[var(--zen-primary-container)]/20"
                      : ""
                  }`}
                  onClick={() => toggleFolder("all")}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {expandedFolders.has("all") ? (
                      <ChevronDown size={12} />
                    ) : (
                      <ChevronRight size={12} />
                    )}
                    <FileText size={12} className="text-[var(--zen-on-surface-variant)]" />
                    <span className="truncate">General Notes</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 opacity-60">
                    <span className="text-[10px]">{uncategorizedNotes.length}</span>
                    <button
                      onClick={(e) => handleCreateNoteInFolder(e, null)}
                      className="p-0.5 hover:bg-[var(--zen-surface-high)] rounded text-[var(--zen-on-surface-variant)]"
                      title="New Note"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>

                {expandedFolders.has("all") && (
                  <div className="pl-4 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--zen-border)] ml-3">
                    {uncategorizedNotes.map((note) => (
                      <NoteItem
                        key={note.id}
                        note={note}
                        isSelected={selectedNote?.id === note.id}
                        onDragStart={(e) => handleNoteDragStart(e, note.id)}
                      />
                    ))}
                    {uncategorizedNotes.length === 0 && (
                      <div className="text-[10px] text-[var(--zen-on-surface-variant)] opacity-50 px-2 py-1 italic">
                        Empty
                      </div>
                    )}
                  </div>
                )}
              </SidebarMenuItem>

              {/* Individual Notebooks (Folders) */}
              {folders.map((folder) => {
                const folderNotes = notes.filter((n) => n.folderId === folder.id);
                const isExpanded = expandedFolders.has(folder.id);
                const isOver = dragOverFolderId === folder.id;

                return (
                  <SidebarMenuItem key={folder.id} className="mb-1">
                    <div
                      onDrop={(e) => handleFolderDrop(e, folder.id)}
                      onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                      onDragLeave={handleFolderDragLeave}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm font-normal cursor-pointer transition-colors hover:bg-[var(--zen-surface-high)] group ${
                        isOver
                          ? "ring-1 ring-[var(--zen-primary)] bg-[var(--zen-primary-container)]/20"
                          : ""
                      }`}
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        {isExpanded ? (
                          <FolderOpen size={12} className="text-[var(--zen-primary)]" />
                        ) : (
                          <FolderIcon size={12} className="text-[var(--zen-on-surface-variant)]" />
                        )}
                        <span className="truncate">{folder.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] opacity-60">{folderNotes.length}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                          <button
                            onClick={(e) => handleCreateNoteInFolder(e, folder.id)}
                            className="p-0.5 hover:bg-[var(--zen-surface-high)] rounded text-[var(--zen-on-surface-variant)]"
                            title="New Note"
                          >
                            <Plus size={10} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteFolder(e, folder.id)}
                            className="p-0.5 hover:bg-[var(--zen-surface-high)] rounded text-[var(--zen-error)]"
                            title="Delete Folder"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pl-4 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--zen-border)] ml-3">
                        {folderNotes.map((note) => (
                          <NoteItem
                            key={note.id}
                            note={note}
                            isSelected={selectedNote?.id === note.id}
                            onDragStart={(e) => handleNoteDragStart(e, note.id)}
                          />
                        ))}
                        {folderNotes.length === 0 && (
                          <div className="text-[10px] text-[var(--zen-on-surface-variant)] opacity-50 px-2 py-1 italic">
                            Empty
                          </div>
                        )}
                      </div>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--zen-border)] p-2">
        {isLoading || isCreatingNote ? (
          <div className="flex items-center justify-center gap-2 py-1.5 text-xs text-[var(--zen-on-surface-variant)] opacity-60">
            <Loader2 size={12} className="animate-spin" />
            <span>Updating...</span>
          </div>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}

function NoteItem({
  note,
  isSelected,
  onDragStart,
}: {
  note: { id: number; title: string };
  isSelected: boolean;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <Link
      draggable
      onDragStart={onDragStart}
      href={`/realShowList?noteId=${note.id}`}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm cursor-pointer truncate transition-all duration-200 font-normal ${
        isSelected
          ? "bg-[var(--zen-primary-container)] text-[var(--zen-on-primary-container)] outline outline-1 outline-dashed outline-[var(--zen-outline-variant)]"
          : "text-[var(--zen-on-surface-variant)] hover:bg-[var(--zen-surface-high)]"
      }`}
    >
      <FileText size={12} className="opacity-60 shrink-0" />
      <span className="truncate">{note.title || "Untitled"}</span>
    </Link>
  );
}
