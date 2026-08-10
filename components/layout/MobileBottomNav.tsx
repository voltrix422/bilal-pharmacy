"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Menu,
  Package,
  PackageOpen,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar";
import { useNavTransition } from "@/components/layout/NavTransition";

type Tab = {
  label: string;
  href?: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
  action?: "more";
};

function tabsForRole(role: Role): Tab[] {
  const base: Tab[] = [
    {
      label: "Home",
      href: "/dashboard",
      icon: LayoutDashboard,
      match: (p) => p === "/dashboard",
    },
    {
      label: "POS",
      href: "/pos",
      icon: ShoppingCart,
      match: (p) => p.startsWith("/pos"),
    },
  ];

  if (role === "CASHIER") {
    return [
      ...base,
      {
        label: "Sales",
        href: "/sales",
        icon: Package,
        match: (p) => p.startsWith("/sales"),
      },
      {
        label: "Orders",
        href: "/website/orders",
        icon: PackageOpen,
        match: (p) => p.startsWith("/website/orders"),
      },
      { label: "More", icon: Menu, action: "more" },
    ];
  }

  return [
    ...base,
    {
      label: "Stock",
      href: "/inventory",
      icon: Package,
      match: (p) => p === "/inventory" || p.startsWith("/inventory/"),
    },
    {
      label: "Orders",
      href: "/website/orders",
      icon: PackageOpen,
      match: (p) => p.startsWith("/website"),
    },
    { label: "More", icon: Menu, action: "more" },
  ];
}

export function MobileBottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const { navigate } = useNavTransition();
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);
  const tabs = tabsForRole(role);

  React.useEffect(() => {
    for (const tab of tabs) {
      if (tab.href) {
        try {
          router.prefetch(tab.href);
        } catch {
          /* ignore */
        }
      }
    }
  }, [router, role]); // eslint-disable-line react-hooks/exhaustive-deps

  if (pathname.startsWith("/pos")) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match ? tab.match(pathname) : false;

          if (tab.action === "more") {
            return (
              <button
                key="more"
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium text-muted-foreground active:bg-muted"
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                More
              </button>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href!}
              prefetch
              onClick={(e) => {
                e.preventDefault();
                navigate(tab.href!, tab.label);
              }}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium transition-colors active:bg-muted",
                active ? "text-[#1d9851]" : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn("h-5 w-5", active && "text-[#1d9851]")}
                strokeWidth={active ? 2 : 1.75}
              />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
