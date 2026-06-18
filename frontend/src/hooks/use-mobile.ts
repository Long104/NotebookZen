import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// Subscribe to viewport changes — passed to useSyncExternalStore.
function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/**
 * SSR-safe viewport breakpoint hook.
 *
 * Uses useSyncExternalStore so React controls when the browser value is read
 * (after hydration), avoiding both setState-in-effect cascades and hydration
 * mismatches. Returns `false` during SSR / before hydration.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT, // client snapshot
    () => false, // server snapshot
  );
}
