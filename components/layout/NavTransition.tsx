"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { NAV_ITEMS, resolveNavLabel } from "@/components/layout/nav-items";

type NavTransitionContextValue = {
  navigate: (href: string, label?: string) => void;
  /** True while a route change is in flight (even before loader appears). */
  isTransitioning: boolean;
  /** True only when navigation is slow enough to show the loader. */
  showLoader: boolean;
  pendingLabel: string | null;
};

const NavTransitionContext =
  React.createContext<NavTransitionContextValue | null>(null);

/** Show loader only if navigation still pending after this delay. */
const LOADER_DELAY_MS = 180;
/** Safety clear if route never settles. */
const LOADER_MAX_MS = 10_000;

export function useNavTransition() {
  const ctx = React.useContext(NavTransitionContext);
  if (!ctx) {
    throw new Error("useNavTransition must be used within NavTransitionProvider");
  }
  return ctx;
}

export function NavTransitionProvider({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: Role;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = React.useState<string | null>(null);
  const [showLoader, setShowLoader] = React.useState(false);

  const fromPathRef = React.useRef(pathname);
  const delayTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const maxTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = React.useCallback(() => {
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const endTransition = React.useCallback(() => {
    clearTimers();
    setPendingHref(null);
    setPendingLabel(null);
    setShowLoader(false);
  }, [clearTimers]);

  // Prefetch role routes on idle
  React.useEffect(() => {
    if (!role) return;
    const hrefs = NAV_ITEMS.filter((item) => item.roles.includes(role)).map(
      (item) => item.href
    );

    const warm = () => {
      for (const href of hrefs) {
        try {
          router.prefetch(href);
        } catch {
          /* ignore */
        }
      }
    };

    const ric = (
      window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number }
        ) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;

    if (typeof ric === "function") {
      const id = ric(warm, { timeout: 1500 });
      return () =>
        (
          window as Window & { cancelIdleCallback?: (id: number) => void }
        ).cancelIdleCallback?.(id);
    }

    const t = window.setTimeout(warm, 200);
    return () => window.clearTimeout(t);
  }, [role, router]);

  // End transition when the URL actually changes
  React.useEffect(() => {
    if (!pendingHref) return;
    if (pathname !== fromPathRef.current) {
      endTransition();
    }
  }, [pathname, pendingHref, endTransition]);

  const navigate = React.useCallback(
    (href: string, label?: string) => {
      if (!href) return;
      if (href === pathname) {
        endTransition();
        return;
      }

      clearTimers();
      fromPathRef.current = pathname;
      const resolved = resolveNavLabel(href, label);
      setPendingHref(href);
      setPendingLabel(resolved);
      setShowLoader(false);

      // Only show loader if still waiting after a short delay
      delayTimerRef.current = setTimeout(() => {
        setShowLoader(true);
      }, LOADER_DELAY_MS);

      maxTimerRef.current = setTimeout(() => {
        endTransition();
      }, LOADER_MAX_MS);

      try {
        router.prefetch(href);
      } catch {
        /* ignore */
      }
      router.push(href);
    },
    [pathname, router, clearTimers, endTransition]
  );

  const value = React.useMemo(
    () => ({
      navigate,
      isTransitioning: pendingHref !== null,
      showLoader,
      pendingLabel,
    }),
    [navigate, pendingHref, showLoader, pendingLabel]
  );

  return (
    <NavTransitionContext.Provider value={value}>
      {children}
      <NavSlowLoader visible={showLoader} label={pendingLabel} />
    </NavTransitionContext.Provider>
  );
}

function NavSlowLoader({
  visible,
  label,
}: {
  visible: boolean;
  label: string | null;
}) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-0.5 w-full overflow-hidden bg-[#1d9851]/15">
        <div className="h-full w-1/3 animate-[nav-progress_0.9s_ease-in-out_infinite] rounded-full bg-[#1d9851]" />
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-md">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1d9851]" />
        <span>Opening{label ? ` ${label}` : ""}…</span>
      </div>
    </div>
  );
}

export function PageEnter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="min-h-0 flex-1">
      {children}
    </div>
  );
}
