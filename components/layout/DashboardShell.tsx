"use client";

import type { ReactNode } from "react";
import type { Role } from "@prisma/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavShortcuts } from "@/components/layout/NavShortcuts";
import {
  NavTransitionProvider,
  PageEnter,
} from "@/components/layout/NavTransition";

type ShellUser = {
  name?: string | null;
  email?: string | null;
  role: Role;
  avatar?: string | null;
};

export function DashboardShell({
  role,
  user,
  children,
}: {
  role: Role;
  user: ShellUser;
  children: ReactNode;
}) {
  return (
    <NavTransitionProvider role={role}>
      <div className="flex min-h-[100dvh] bg-background">
        <NavShortcuts role={role} />
        <Sidebar role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar user={user} />
          <main className="flex flex-1 flex-col overflow-x-hidden bg-background p-3 pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:p-3 md:pb-3 [&:has([data-pos-terminal])]:p-0 [&:has([data-pos-terminal])]:pb-0">
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-3 md:space-y-2 [&:has([data-pos-terminal])]:max-w-none">
              <PageEnter>{children}</PageEnter>
            </div>
          </main>
          <MobileBottomNav role={role} />
        </div>
      </div>
    </NavTransitionProvider>
  );
}
