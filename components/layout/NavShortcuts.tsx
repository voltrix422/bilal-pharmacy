"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Role } from "@prisma/client";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useNavTransition } from "@/components/layout/NavTransition";
import {
  moduleKeyForHref,
  resolveModuleAccess,
} from "@/lib/permissions/modules";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true'], [role='textbox']"));
}

export function NavShortcuts({ role }: { role: Role }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { navigate, isTransitioning } = useNavTransition();
  const cycleRef = React.useRef<{ key: string; index: number }>({
    key: "",
    index: -1,
  });

  React.useEffect(() => {
    const access = resolveModuleAccess(
      role,
      session?.user?.moduleAccess ?? null
    );
    const items = NAV_ITEMS.filter((item) => {
      if (!item.roles.includes(role)) return false;
      const key = moduleKeyForHref(item.href);
      if (!key) return true;
      return (access[key] ?? "none") !== "none";
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (isTransitioning) return;
      if (e.key.length !== 1) return;

      const key = e.key.toLowerCase();
      if (!/[a-z]/.test(key)) return;

      const matches = items.filter((item) =>
        item.title.toLowerCase().startsWith(key)
      );
      if (matches.length === 0) return;

      e.preventDefault();

      const cycle = cycleRef.current;
      let nextIndex =
        cycle.key === key ? (cycle.index + 1) % matches.length : 0;

      if (matches.length > 1) {
        const currentIdx = matches.findIndex(
          (m) => pathname === m.href || pathname.startsWith(`${m.href}/`)
        );
        if (cycle.key !== key && currentIdx >= 0) {
          nextIndex = (currentIdx + 1) % matches.length;
        }
      }

      cycleRef.current = { key, index: nextIndex };
      const target = matches[nextIndex];
      if (target) navigate(target.href, target.title);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [role, navigate, isTransitioning, pathname, session?.user?.moduleAccess]);

  return null;
}
