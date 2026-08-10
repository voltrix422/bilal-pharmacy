import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    avatar: session.user.avatar,
  };

  return (
    <DashboardShell role={session.user.role} user={user}>
      {children}
    </DashboardShell>
  );
}
