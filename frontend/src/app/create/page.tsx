"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import CreateToprow from "@/components/CreateToprow";
import CreateMenu from "@/components/CreateMenu";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Navbar from "@/components/Navbar";

export default function Create() {
    const { isSignedIn, isLoaded } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/");
        }
    }, [isLoaded, isSignedIn, router]);

    if (!isLoaded || !isSignedIn) {
        return null;
    }

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
