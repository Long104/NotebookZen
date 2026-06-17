"use client";

import CreateToprow from "@/components/CreateToprow";
import CreateMenu from "@/components/CreateMenu";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Navbar from "@/components/Navbar";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function Create() {
    const ready = useRequireAuth();
    if (!ready) return null;

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <Navbar />
                <div className="w-full min-h-[calc(100vh-4rem)]">
                    <div className="flex flex-col gap-8 items-center py-8">
                        <CreateToprow />
                        <CreateMenu />
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
