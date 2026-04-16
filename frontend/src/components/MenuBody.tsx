import Image from "next/image";
import Card from "@/components/Card";
import Link from "next/link";
import { PenLine, List, Share2 } from "lucide-react";
import { useChatPanel } from "@/context/ChatPanelContext";
import { MessageSquare } from "lucide-react";

function AiChatCard() {
    const { openPanel } = useChatPanel();
    return (
        <div onClick={openPanel} className="cursor-pointer">
            <Card
                icon={<MessageSquare size={24} />}
                title="AI Chat"
                description="Ask questions about your notes"
            />
        </div>
    );
}

export default function MenuBody() {
    return (
        <div className="max-w-4xl mx-auto px-8 py-16">
            <div className="flex flex-col items-center gap-8 py-16">
                <Image
                    src="/BodyLogo.jpg"
                    alt="BodyLogo"
                    width={80}
                    height={80}
                    className="rounded-full"
                />
                <div className="flex flex-col items-center gap-4">
                    <h1 className="text-3xl font-medium tracking-tight">
                        Calm yourself by Jotting
                    </h1>
                    <p className="text-[var(--zen-on-surface-variant)] text-center max-w-md leading-relaxed">
                        Store your golden ideas, manage and scale your thoughts,
                        and link your insights in one simple concept.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Link href="/create">
                    <Card
                        icon={<PenLine size={24} />}
                        title="Create"
                        description="Start a fresh idea"
                    />
                </Link>
                <Link href="/realShowList">
                    <Card
                        icon={<List size={24} />}
                        title="Save List"
                        description="Store and manage your ideas"
                    />
                </Link>
                <Link href="/create">
                    <Card
                        icon={<Share2 size={24} />}
                        title="Mapping"
                        description="Connect and link your ideas"
                    />
                </Link>
                <AiChatCard />
            </div>
        </div>
    );
}
