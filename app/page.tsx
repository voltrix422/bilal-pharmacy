import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import { LandingPage } from "@/components/marketing/LandingPage";

function defaultRouteForRole(role: Role | undefined): string {
  switch (role) {
    case "CUSTOMER":
      return "/order";
    case "CASHIER":
      return "/pos";
    case "PHARMACIST":
      return "/inventory";
    case "MANAGER":
      return "/reports";
    case "ADMIN":
    default:
      return "/dashboard";
  }
}

export default async function HomePage() {
  const session = await auth();

  // Keep the public site open for customers; only send staff into ERP
  if (session?.user && session.user.role !== "CUSTOMER") {
    redirect(defaultRouteForRole(session.user.role));
  }

  return <LandingPage />;
}
