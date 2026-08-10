import type { Role } from "@prisma/client";
import {
  BarChart3,
  Bell,
  ClipboardList,
  FileText,
  Globe,
  Layers,
  LayoutDashboard,
  Package,
  PackageOpen,
  Pill,
  Receipt,
  RotateCcw,
  Settings,
  ShoppingCart,
  Truck,
  UserCog,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "MANAGER", "PHARMACIST", "CASHIER"],
  },
  {
    title: "Medicines",
    href: "/medicines",
    icon: Pill,
    roles: ["ADMIN", "MANAGER", "PHARMACIST"],
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Package,
    roles: ["ADMIN", "MANAGER", "PHARMACIST"],
  },
  {
    title: "Batches",
    href: "/inventory/batches",
    icon: Layers,
    roles: ["ADMIN", "MANAGER", "PHARMACIST"],
  },
  {
    title: "POS",
    href: "/pos",
    icon: ShoppingCart,
    roles: ["ADMIN", "MANAGER", "PHARMACIST", "CASHIER"],
  },
  {
    title: "Prescriptions",
    href: "/prescriptions",
    icon: FileText,
    roles: ["ADMIN", "MANAGER", "PHARMACIST"],
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
    roles: ["ADMIN", "MANAGER", "PHARMACIST", "CASHIER"],
  },
  {
    title: "Suppliers",
    href: "/suppliers",
    icon: Truck,
    roles: ["ADMIN", "MANAGER", "PHARMACIST"],
  },
  {
    title: "Purchases",
    href: "/purchases",
    icon: ClipboardList,
    roles: ["ADMIN", "MANAGER", "PHARMACIST"],
  },
  {
    title: "Sales",
    href: "/sales",
    icon: Receipt,
    roles: ["ADMIN", "MANAGER", "PHARMACIST", "CASHIER"],
  },
  {
    title: "Web products",
    href: "/website/products",
    icon: Globe,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    title: "Web orders",
    href: "/website/orders",
    icon: PackageOpen,
    roles: ["ADMIN", "MANAGER", "PHARMACIST", "CASHIER"],
  },
  {
    title: "Web customers",
    href: "/website/customers",
    icon: UserRound,
    roles: ["ADMIN", "MANAGER", "PHARMACIST", "CASHIER"],
  },
  {
    title: "Returns",
    href: "/returns",
    icon: RotateCcw,
    roles: ["ADMIN", "MANAGER", "PHARMACIST"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["ADMIN", "MANAGER", "PHARMACIST"],
  },
  {
    title: "Users",
    href: "/users",
    icon: UserCog,
    roles: ["ADMIN"],
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
    roles: ["ADMIN", "MANAGER", "PHARMACIST", "CASHIER"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["ADMIN", "MANAGER", "PHARMACIST"],
  },
];

export function resolveNavLabel(href: string, label?: string) {
  if (label?.trim()) return label.trim();

  const exact = NAV_ITEMS.find((item) => item.href === href);
  if (exact) return exact.title;

  const partial = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => href === item.href || href.startsWith(`${item.href}/`));

  return partial?.title ?? "page";
}
