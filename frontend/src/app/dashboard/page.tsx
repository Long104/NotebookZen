"use client";

import MenuBody from "@/components/MenuBody";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Navbar from "@/components/Navbar";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function Dashboard() {
    const ready = useRequireAuth();
    if (!ready) return null;

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <div className="min-h-screen">
                    <Navbar />
                    <MenuBody />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
