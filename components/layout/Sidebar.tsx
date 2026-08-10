"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar";
import { useNavTransition } from "@/components/layout/NavTransition";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import {
  moduleKeyForHref,
  resolveModuleAccess,
} from "@/lib/permissions/modules";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/medicines") {
    return pathname === "/medicines" || pathname.startsWith("/medicines/");
  }
  if (href === "/inventory") {
    return pathname === "/inventory";
  }
  if (href === "/inventory/batches") {
    return pathname.startsWith("/inventory/batches");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarProps {
  role: Role;
}

function Logo({
  collapsed,
  onToggle,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);

  return (
    <button
      type="button"
      onClick={() => {
        if (onToggle) {
          onToggle();
          return;
        }
        toggleCollapsed();
      }}
      className={cn(
        "flex w-full cursor-pointer items-center rounded-md p-1 transition-colors hover:bg-muted/60",
        collapsed ? "justify-center" : "justify-start gap-0 px-1"
      )}
      aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
      aria-expanded={!collapsed}
      title={collapsed ? "Open sidebar" : "Close sidebar"}
    >
      <Image
        src="/bilal-pharmacy-mark.png"
        alt="Bilal Pharmacy"
        width={32}
        height={32}
        className={cn("object-contain", collapsed ? "h-7 w-7" : "h-8 w-8")}
        priority
      />
      {!collapsed ? (
        <span className="ml-1.5 truncate text-left text-[11px] font-semibold leading-tight tracking-tight text-[#1d9851]">
          Bilal
          <span className="block text-[9px] font-medium text-muted-foreground">
            Pharmacy
          </span>
        </span>
      ) : null}
    </button>
  );
}

function NavLinks({
  role,
  collapsed,
  onNavigate,
}: {
  role: Role;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { navigate } = useNavTransition();
  const { data: session } = useSession();
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

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="flex flex-col gap-0.5 px-1.5">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          const linkClassName = cn(
            "group flex items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-[11px] font-medium transition-colors",
            collapsed && "justify-center px-1",
            active
              ? "border-stroke text-foreground"
              : "text-muted-foreground hover:border-border hover:text-foreground"
          );

          const shortcut = item.title.charAt(0).toUpperCase();

          const link = (
            <Link
              href={item.href}
              prefetch
              onClick={(e) => {
                e.preventDefault();
                onNavigate?.();
                navigate(item.href, item.title);
              }}
              className={linkClassName}
              title={`${item.title} (${shortcut})`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <kbd className="shrink-0 rounded border border-border px-1 py-px font-mono text-[9px] text-muted-foreground">
                    {shortcut}
                  </kbd>
                </>
              ) : null}
            </Link>
          );

          if (!collapsed) {
            return <div key={item.href}>{link}</div>;
          }

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">
                {item.title} · {shortcut}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

function DesktopSidebar({ role }: { role: Role }) {
  const collapsed = useSidebarStore((s) => s.collapsed);

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 hidden h-screen flex-col border-r border-border bg-background text-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-12" : "w-44"
      )}
    >
      <div
        className={cn(
          "flex h-12 items-center border-b border-border px-1.5",
          collapsed && "justify-center"
        )}
      >
        <Logo collapsed={collapsed} />
      </div>

      <ScrollArea className="flex-1 py-2">
        <NavLinks role={role} collapsed={collapsed} />
      </ScrollArea>
    </aside>
  );
}

function MobileSidebar({ role }: { role: Role }) {
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent
        side="left"
        className="w-[min(86vw,300px)] border-r border-border bg-background p-0 text-foreground"
      >
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Logo onToggle={() => setMobileOpen(false)} />
        </SheetHeader>
        <Separator />
        <ScrollArea className="h-[calc(100dvh-4.5rem)] py-3">
          <div className="px-1 [&_a]:min-h-11 [&_a]:rounded-xl [&_a]:px-3 [&_a]:py-2.5 [&_a]:text-sm [&_kbd]:hidden">
            <NavLinks role={role} onNavigate={() => setMobileOpen(false)} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function Sidebar({ role }: SidebarProps) {
  return (
    <>
      <DesktopSidebar role={role} />
      <MobileSidebar role={role} />
    </>
  );
}

export { NAV_ITEMS } from "@/components/layout/nav-items";
