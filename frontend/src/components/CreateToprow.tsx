import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import Link from "next/link";

export default function CreateToprow() {
    return (
        <div className="flex justify-between items-center w-full max-w-3xl px-6">
            <Link
                href="/"
                className="zen-btn-ghost flex items-center gap-2 text-sm"
            >
                <ArrowLeft size={16} />
                Back to Menu
            </Link>

            <div className="text-lg font-medium tracking-tight">
                Create New Note
            </div>

            <Link href="/realShowList">
                <Button variant="outline" className="text-xs">
                    <Menu size={14} />
                    View All Notes
                </Button>
            </Link>
        </div>
    );
}
