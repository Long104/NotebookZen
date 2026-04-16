"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
    Sidebar,
    SidebarProvider,
    SidebarInset,
} from "@/components/ui/sidebar";

export default function ShowList() {
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
            <div className="flex">
                <Sidebar />
                <h1 className="p-4">Show List</h1>
            </div>
        </SidebarProvider>
    );
}
