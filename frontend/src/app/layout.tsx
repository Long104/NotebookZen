import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/lib/theme";
import { ChatPanelProvider } from "@/context/ChatPanelContext";
import AiPanel from "@/components/AiPanel";
import "./globals.css";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
    variable: "--font-instrument-serif",
    subsets: ["latin"],
    weight: "400",
});

export const metadata: Metadata = {
    title: "ZenNote",
    description: "Calm yourself by jotting",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} ${instrumentSerif.variable} font-sans antialiased`} >
                <ClerkProvider>
                    <ThemeProvider>
                        <ChatPanelProvider>
                            {children}
                            <AiPanel />
                        </ChatPanelProvider>
                    </ThemeProvider>
                </ClerkProvider>
            </body>
        </html>
    );
}
