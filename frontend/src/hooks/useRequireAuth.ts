"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

/**
 * Client-side auth guard for protected pages.
 *
 * Redirects signed-out users to "/" once Clerk has finished loading, and
 * returns `true` only when the user is confirmed signed in and safe to render.
 *
 * Replaces the copy-pasted `useUser()` + redirect effect that appeared in
 * every protected page. For edge-level protection see `src/middleware.ts`.
 *
 * NOTE: the landing page (`/`) uses inverse logic (redirect when *signed in*)
 * and therefore does NOT use this hook.
 *
 * @returns `true` when the user is signed in; `false` while loading or signed out.
 */
export function useRequireAuth(): boolean {
    const { isSignedIn, isLoaded } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/");
        }
    }, [isLoaded, isSignedIn, router]);

    return isLoaded && isSignedIn;
}
