import {
    CardContent,
} from "@/components/ui/card";

type CardSmallProps = {
    title: string;
    description: string;
    icon: React.ReactNode;
};

export default function CardSmall({ title, description, icon }: CardSmallProps) {
    return (
        <div className="zen-card flex flex-col gap-3 items-center text-center py-8">
            <div className="text-[var(--zen-primary)]">{icon}</div>
            <CardContent className="text-lg font-medium">{title}</CardContent>
            <CardContent className="text-sm text-[var(--zen-on-surface-variant)]">
                {description}
            </CardContent>
        </div>
    );
}
