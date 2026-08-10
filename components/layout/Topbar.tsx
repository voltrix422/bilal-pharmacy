"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import type { Role } from "@prisma/client";
import {
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/layout/NotificationBell";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/medicines": "Medicines",
  "/medicines/add": "Add Medicine",
  "/inventory": "Inventory",
  "/inventory/batches": "Batches",
  "/pos": "POS",
  "/website/products": "Web products",
  "/website/orders": "Web orders",
  "/website/customers": "Web customers",
  "/prescriptions": "Prescriptions",
  "/customers": "Customers",
  "/suppliers": "Suppliers",
  "/purchases": "Purchases",
  "/sales": "Sales",
  "/returns": "Returns",
  "/reports": "Reports",
  "/reports/sales": "Sales report",
  "/reports/inventory": "Inventory report",
  "/reports/expiry": "Expiry report",
  "/reports/financial": "Financial report",
  "/users": "Users",
  "/notifications": "Notifications",
  "/settings": "Settings",
};

const ROLE_BADGE: Record<Role, { label: string; className: string }> = {
  ADMIN: {
    label: "Admin",
    className: "border border-stroke bg-transparent text-foreground",
  },
  MANAGER: {
    label: "Manager",
    className: "border border-stroke bg-transparent text-foreground",
  },
  PHARMACIST: {
    label: "Pharmacist",
    className: "border border-border bg-transparent text-foreground",
  },
  CASHIER: {
    label: "Cashier",
    className: "border border-border bg-transparent text-muted-foreground",
  },
  CUSTOMER: {
    label: "Customer",
    className: "border border-border bg-transparent text-muted-foreground",
  },
};

function resolveTitle(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  const match = Object.keys(PAGE_TITLES)
    .filter((key) => key !== "/" && pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];

  return match ? PAGE_TITLES[match] : "Bilal Pharmacy";
}

function getInitials(name?: string | null) {
  if (!name) return "BP";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "BP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export interface TopbarUser {
  name?: string | null;
  email?: string | null;
  role: Role;
  avatar?: string | null;
}

interface TopbarProps {
  user: TopbarUser;
  showSearch?: boolean;
}

export function Topbar({ user, showSearch = true }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const title = useMemo(() => resolveTitle(pathname), [pathname]);
  const roleMeta = ROLE_BADGE[user.role] ?? {
    label: user.role,
    className: "border border-border bg-transparent text-muted-foreground",
  };

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    const q = search.trim();
    if (!q) return;
    router.push(`/medicines?q=${encodeURIComponent(q)}`);
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/90">
      <div className="flex h-12 items-center gap-2 px-3 sm:h-10 sm:px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-foreground sm:text-xs">
            {title}
          </h1>
        </div>

        {showSearch ? (
          <form
            onSubmit={handleSearchSubmit}
            className="relative hidden max-w-xs flex-1 lg:block xl:max-w-sm"
          >
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-7 pl-7 text-xs"
              aria-label="Search medicines"
            />
          </form>
        ) : null}

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Toggle theme"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.5} />
            )}
          </Button>

          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 gap-1.5 rounded-md px-1.5"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage
                    src={user.avatar ?? undefined}
                    alt={user.name ?? "User"}
                  />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[100px] truncate text-xs font-medium md:inline">
                  {user.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1.5">
                  <p className="truncate text-sm font-medium leading-none">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                  <Badge
                    variant="secondary"
                    className={cn("w-fit border-0", roleMeta.className)}
                  >
                    {roleMeta.label}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <User className="mr-2 h-4 w-4" />
                Profile & settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
