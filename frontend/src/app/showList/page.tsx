import {
    Sidebar,
    SidebarProvider,
    SidebarInset,
} from "@/components/ui/sidebar"

export default function ShowList() {
    return (
        <SidebarProvider>
            <div className="flex">
                <Sidebar />
                <h1 className="p-4">Show List</h1>
            </div>
        </SidebarProvider>
    )
}