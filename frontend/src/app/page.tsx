"use client";

import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
    Play,
    Search,
    Bell,
    ChevronDown,
    ChevronRight,
    Plus,
    MoreHorizontal,
    Home,
    FileText,
    FolderOpen,
    Tag,
    Settings,
    Sparkles,
    FileEdit,
    CheckCircle2,
    Clock,
    BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: "easeOut" },
});

const fadeUpBadge = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: "easeOut" },
};

const fadeUpSlow = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay: 0.5, ease: "easeOut" },
};

export default function LandingPage() {
    const { isSignedIn, isLoaded } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            router.push("/dashboard");
        }
    }, [isLoaded, isSignedIn, router]);

    if (!isLoaded || isSignedIn) {
        return null;
    }

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden">
            <Navbar />
            <HeroSection />
        </div>
    );
}

function Navbar() {
    return (
        <nav className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-5 font-[family-name:var(--font-inter)] relative z-10">
            <div className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                <span className="text-2xl">&#10022;</span>
                NotebookZen
            </div>
            <div className="hidden md:flex items-center gap-4">
                <Link href="/sign-in">
                    <Button
                        variant="ghost"
                        className="rounded-full px-5 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                        Log In
                    </Button>
                </Link>
                <Link href="/sign-up">
                    <Button
                        variant="default"
                        className="rounded-full px-5 text-sm font-medium"
                    >
                        Get Started
                    </Button>
                </Link>
            </div>
        </nav>
    );
}

function HeroSection() {
    return (
        <div className="flex-1 relative flex flex-col items-center justify-start pt-4 md:pt-8 overflow-hidden">
            <div
                className="absolute inset-0 w-full h-full object-cover z-0"
                style={{
                    backgroundImage: "url('/zen-bg.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: 0.08,
                }}
            />

            <div className="relative z-10 flex flex-col items-center w-full px-6">
                <motion.div {...fadeUpBadge} className="mb-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground font-[family-name:var(--font-inter)]">
                        Now with AI-powered notes <Sparkles className="h-3.5 w-3.5" />
                    </span>
                </motion.div>

                <motion.h1
                    {...fadeUp(0.1)}
                    className="text-center font-[family-name:var(--font-instrument-serif)] text-5xl md:text-6xl lg:text-[5rem] leading-[0.95] tracking-tight text-foreground max-w-xl"
                >
                    The Future of{" "}
                    <em className="font-[family-name:var(--font-instrument-serif)]">
                        Smarter
                    </em>{" "}
                    Note-Taking
                </motion.h1>

                <motion.p
                    {...fadeUp(0.2)}
                    className="mt-4 text-center text-base md:text-lg text-muted-foreground max-w-[650px] leading-relaxed font-[family-name:var(--font-inter)]"
                >
                    Capture your thoughts with intelligent notes that organize
                    themselves, surface insights, and adapt to how you think
                    &mdash; so you can focus on what matters most.
                </motion.p>

                <motion.div {...fadeUp(0.3)} className="mt-5 flex items-center gap-3">
                    <Link href="/sign-up">
                        <Button
                            variant="default"
                            className="rounded-full px-6 py-5 text-sm font-medium font-[family-name:var(--font-inter)]"
                        >
                            Get Started Free
                        </Button>
                    </Link>
                </motion.div>

                <motion.div {...fadeUpSlow} className="mt-8 w-full max-w-5xl">
                    <DashboardPreview />
                </motion.div>
            </div>
        </div>
    );
}

function DashboardPreview() {
    return (
        <div
            className="rounded-2xl overflow-hidden p-3 md:p-4"
            style={{
                background: "rgba(255, 255, 255, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                boxShadow:
                    "0 25px 80px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.06)",
            }}
        >
            <div className="flex h-[420px] rounded-xl overflow-hidden bg-white text-foreground select-none pointer-events-none text-[11px]">
                <Sidebar />
                <MainContent />
            </div>
        </div>
    );
}

function Sidebar() {
    const mainItems = [
        { icon: Home, label: "Home", active: true },
        { icon: FileText, label: "Notes", badge: "24" },
        { icon: FolderOpen, label: "Notebooks" },
        { icon: FileEdit, label: "Templates", chevron: true },
        { icon: BookOpen, label: "Journal", chevron: true },
    ];

    const workflowItems = [
        "Workflows",
        "Tags",
        "Notifications",
        "Settings",
    ];

    return (
        <div className="w-40 border-r border-border/60 bg-muted/30 py-3 px-2 flex flex-col shrink-0">
            <div className="flex items-center gap-2 px-2 pb-3 mb-2 border-b border-border/60">
                <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold">
                    Z
                </div>
                <span className="text-[11px] font-semibold">NotebookZen</span>
                <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground" />
            </div>

            <div className="flex-1 space-y-0.5">
                {mainItems.map((item) => (
                    <div
                        key={item.label}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] ${
                            item.active
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground"
                        }`}
                    >
                        <item.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                            <span className="text-[9px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-medium">
                                {item.badge}
                            </span>
                        )}
                        {item.chevron && (
                            <ChevronRight className="h-3 w-3 shrink-0" />
                        )}
                    </div>
                ))}

                <div className="pt-2 mt-2 border-t border-border/60">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
                        Organize
                    </div>
                    {workflowItems.map((label) => (
                        <div
                            key={label}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-muted-foreground"
                        >
                            {label === "Tags" && (
                                <Tag className="h-3.5 w-3.5 shrink-0" />
                            )}
                            {label === "Notifications" && (
                                <Bell className="h-3.5 w-3.5 shrink-0" />
                            )}
                            {label === "Settings" && (
                                <Settings className="h-3.5 w-3.5 shrink-0" />
                            )}
                            {label === "Workflows" && (
                                <FileEdit className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function MainContent() {
    const actionButtons = [
        "New Note",
        "Search",
        "Organize",
        "Export",
        "Share",
    ];

    const recentNotes = [
        {
            title: "Q2 Planning Notes",
            folder: "Work",
            date: "Apr 21",
            status: "Edited",
            statusColor: "text-primary",
        },
        {
            title: "Meeting with Design Team",
            folder: "Work",
            date: "Apr 20",
            status: "Completed",
            statusColor: "text-green-600",
        },
        {
            title: "Research: AI in Note-Taking",
            folder: "Ideas",
            date: "Apr 19",
            status: "In Progress",
            statusColor: "text-amber-600",
        },
        {
            title: "Weekend Trip Packing List",
            folder: "Personal",
            date: "Apr 18",
            status: "Completed",
            statusColor: "text-green-600",
        },
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <TopBar />
            <div className="flex-1 bg-secondary/20 p-4 overflow-hidden">
                <div className="text-[12px] font-semibold mb-3">
                    Welcome back, Jane
                </div>

                <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {actionButtons.map((label, i) => (
                        <button
                            key={label}
                            className={`rounded-full px-3 py-1.5 text-[10px] font-medium border transition-colors ${
                                i === 0
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background border-border text-muted-foreground hover:bg-secondary"
                            }`}
                        >
                            {i === 0 && <Plus className="h-2.5 w-2.5 inline mr-1" />}
                            {label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3 mb-4">
                    <div className="flex-1 basis-0 rounded-xl border border-border/60 bg-white p-3">
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Total Notes
                            </div>
                        </div>
                        <div className="text-[18px] font-semibold tracking-tight">
                            1,247
                        </div>
                        <div className="text-[9px] text-muted-foreground mb-2">
                            notes across all notebooks
                        </div>
                        <StatsChart />
                    </div>

                    <div className="flex-1 basis-0 rounded-xl border border-border/60 bg-white p-3">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-[10px] font-semibold">
                                Notebooks
                            </div>
                            <div className="flex items-center gap-1">
                                <Plus className="h-3 w-3 text-muted-foreground" />
                                <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                            </div>
                        </div>
                        {[
                            { name: "Personal", count: 342 },
                            { name: "Work", count: 518 },
                            { name: "Ideas", count: 387 },
                        ].map((item, i) => (
                            <div
                                key={item.name}
                                className={`flex items-center justify-between py-2 text-[11px] ${
                                    i < 2 ? "border-b border-border/40" : ""
                                }`}
                            >
                                <span className="text-muted-foreground">
                                    {item.name}
                                </span>
                                <span className="font-medium">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-white overflow-hidden">
                    <div className="px-3 py-2 border-b border-border/40 text-[10px] font-semibold">
                        Recent Notes
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr className="text-[9px] text-muted-foreground border-b border-border/40">
                                <th className="text-left px-3 py-1.5 font-medium">
                                    Title
                                </th>
                                <th className="text-left px-3 py-1.5 font-medium">
                                    Folder
                                </th>
                                <th className="text-left px-3 py-1.5 font-medium">
                                    Date
                                </th>
                                <th className="text-right px-3 py-1.5 font-medium">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentNotes.map((note) => (
                                <tr
                                    key={note.title}
                                    className="border-b border-border/20 last:border-0"
                                >
                                    <td className="px-3 py-2 text-[11px] font-medium">
                                        {note.title}
                                    </td>
                                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                                        {note.folder}
                                    </td>
                                    <td className="px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-2.5 w-2.5" />
                                        {note.date}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <span
                                            className={`text-[10px] font-medium ${note.statusColor}`}
                                        >
                                            {note.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function TopBar() {
    return (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
            <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center text-primary text-[9px] font-bold">
                    Z
                </div>
                <span className="text-[11px] font-semibold">NotebookZen</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                    All Notes
                </span>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-secondary/60 rounded-md px-2.5 py-1 text-[10px] text-muted-foreground">
                    <Search className="h-3 w-3" />
                    <span>Search notes...</span>
                    <kbd className="text-[8px] bg-background rounded px-1 py-0.5 border border-border ml-3">
                        &#8984;K
                    </kbd>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-secondary/60 rounded-md px-2.5 py-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    AI Assist
                </div>
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-semibold">
                    JB
                </div>
            </div>
        </div>
    );
}

function StatsChart() {
    return (
        <svg
            viewBox="0 0 200 80"
            className="w-full h-20 mt-1"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient
                    id="chartGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                >
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d="M 0 65 C 20 60, 30 50, 50 45 C 70 40, 80 55, 100 40 C 120 25, 130 30, 150 20 C 170 10, 180 15, 200 8"
                stroke="var(--primary)"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M 0 65 C 20 60, 30 50, 50 45 C 70 40, 80 55, 100 40 C 120 25, 130 30, 150 20 C 170 10, 180 15, 200 8 L 200 80 L 0 80 Z"
                fill="url(#chartGradient)"
            />
        </svg>
    );
}
