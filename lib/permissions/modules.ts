import type { Role } from "@prisma/client";

/** Access level for one ERP module */
export type ModuleAccessLevel = "none" | "view" | "edit";

export type ModuleKey =
  | "dashboard"
  | "medicines"
  | "inventory"
  | "batches"
  | "pos"
  | "prescriptions"
  | "customers"
  | "suppliers"
  | "purchases"
  | "sales"
  | "website_products"
  | "website_orders"
  | "website_customers"
  | "returns"
  | "reports"
  | "users"
  | "notifications"
  | "settings";

export type ModuleAccessMap = Partial<Record<ModuleKey, ModuleAccessLevel>>;

export type AppModule = {
  key: ModuleKey;
  label: string;
  href: string;
  /** Path prefixes this module unlocks */
  paths: string[];
};

export const APP_MODULES: AppModule[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    paths: ["/dashboard"],
  },
  {
    key: "medicines",
    label: "Medicines",
    href: "/medicines",
    paths: ["/medicines"],
  },
  {
    key: "inventory",
    label: "Inventory",
    href: "/inventory",
    paths: ["/inventory"],
  },
  {
    key: "batches",
    label: "Batches",
    href: "/inventory/batches",
    paths: ["/inventory/batches"],
  },
  { key: "pos", label: "POS", href: "/pos", paths: ["/pos"] },
  {
    key: "prescriptions",
    label: "Prescriptions",
    href: "/prescriptions",
    paths: ["/prescriptions"],
  },
  {
    key: "customers",
    label: "Customers",
    href: "/customers",
    paths: ["/customers"],
  },
  {
    key: "suppliers",
    label: "Suppliers",
    href: "/suppliers",
    paths: ["/suppliers"],
  },
  {
    key: "purchases",
    label: "Purchases",
    href: "/purchases",
    paths: ["/purchases"],
  },
  { key: "sales", label: "Sales", href: "/sales", paths: ["/sales"] },
  {
    key: "website_products",
    label: "Web products",
    href: "/website/products",
    paths: ["/website/products"],
  },
  {
    key: "website_orders",
    label: "Web orders",
    href: "/website/orders",
    paths: ["/website/orders"],
  },
  {
    key: "website_customers",
    label: "Web customers",
    href: "/website/customers",
    paths: ["/website/customers"],
  },
  { key: "returns", label: "Returns", href: "/returns", paths: ["/returns"] },
  {
    key: "reports",
    label: "Reports",
    href: "/reports",
    paths: ["/reports"],
  },
  { key: "users", label: "Users", href: "/users", paths: ["/users"] },
  {
    key: "notifications",
    label: "Notifications",
    href: "/notifications",
    paths: ["/notifications"],
  },
  {
    key: "settings",
    label: "Settings",
    href: "/settings",
    paths: ["/settings"],
  },
];

/** Known demo / seed staff passwords (hashed in DB — shown for admin reference only). */
export const KNOWN_LOGIN_CREDENTIALS: Array<{
  email: string;
  password: string;
  portal: "ERP /login" | "Shop /order/login";
  note?: string;
}> = [
  {
    email: "admin@bm.com",
    password: "passwordbmADMIN",
    portal: "ERP /login",
  },
  {
    email: "admin@pharmacy.com",
    password: "Admin@123",
    portal: "ERP /login",
  },
  {
    email: "manager@pharmacy.com",
    password: "Manager@123",
    portal: "ERP /login",
  },
  {
    email: "pharmacist@pharmacy.com",
    password: "Pharma@123",
    portal: "ERP /login",
  },
  {
    email: "cashier@pharmacy.com",
    password: "Cashier@123",
    portal: "ERP /login",
  },
];

const ALL_EDIT: ModuleAccessMap = Object.fromEntries(
  APP_MODULES.map((m) => [m.key, "edit" as const])
);

const ROLE_DEFAULTS: Record<Exclude<Role, "CUSTOMER">, ModuleAccessMap> = {
  ADMIN: ALL_EDIT,
  MANAGER: {
    dashboard: "edit",
    medicines: "edit",
    inventory: "edit",
    batches: "edit",
    pos: "edit",
    prescriptions: "edit",
    customers: "edit",
    suppliers: "edit",
    purchases: "edit",
    sales: "edit",
    website_products: "edit",
    website_orders: "edit",
    website_customers: "edit",
    returns: "edit",
    reports: "edit",
    notifications: "edit",
    settings: "edit",
    users: "none",
  },
  PHARMACIST: {
    dashboard: "view",
    medicines: "edit",
    inventory: "edit",
    batches: "edit",
    pos: "edit",
    prescriptions: "edit",
    customers: "edit",
    suppliers: "edit",
    purchases: "edit",
    sales: "edit",
    website_orders: "view",
    website_customers: "view",
    returns: "edit",
    reports: "view",
    notifications: "view",
    settings: "none",
    users: "none",
    website_products: "none",
  },
  CASHIER: {
    dashboard: "view",
    pos: "edit",
    sales: "edit",
    customers: "edit",
    returns: "edit",
    notifications: "view",
    website_orders: "edit",
    website_customers: "view",
    medicines: "none",
    inventory: "none",
    batches: "none",
    prescriptions: "none",
    suppliers: "none",
    purchases: "none",
    website_products: "none",
    reports: "none",
    users: "none",
    settings: "none",
  },
};

export function emptyModuleAccess(): ModuleAccessMap {
  return Object.fromEntries(
    APP_MODULES.map((m) => [m.key, "none" as const])
  ) as ModuleAccessMap;
}

export function roleDefaultAccess(role: Role): ModuleAccessMap {
  if (role === "CUSTOMER") return emptyModuleAccess();
  if (role === "ADMIN") return { ...ALL_EDIT };
  return { ...emptyModuleAccess(), ...ROLE_DEFAULTS[role] };
}

export function parseModuleAccess(raw: unknown): ModuleAccessMap | null {
  if (raw == null || raw === "") return null;
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const out: ModuleAccessMap = {};
  for (const mod of APP_MODULES) {
    const level = (value as Record<string, unknown>)[mod.key];
    if (level === "view" || level === "edit" || level === "none") {
      out[mod.key] = level;
    }
  }
  return out;
}

export function serializeModuleAccess(map: ModuleAccessMap): string {
  const clean: ModuleAccessMap = {};
  for (const mod of APP_MODULES) {
    const level = map[mod.key] ?? "none";
    if (level !== "none") clean[mod.key] = level;
  }
  return JSON.stringify(clean);
}

/** Effective access: custom map if provided, otherwise role defaults. ADMIN always full. */
export function resolveModuleAccess(
  role: Role,
  custom: ModuleAccessMap | null | undefined
): ModuleAccessMap {
  if (role === "ADMIN") return { ...ALL_EDIT };
  if (role === "CUSTOMER") return emptyModuleAccess();
  if (custom && Object.keys(custom).length > 0) {
    return { ...emptyModuleAccess(), ...custom };
  }
  return roleDefaultAccess(role);
}

export function getAccessForPath(
  pathname: string,
  access: ModuleAccessMap
): ModuleAccessLevel {
  // Prefer longest matching module path (batches before inventory)
  const sorted = [...APP_MODULES].sort(
    (a, b) => b.paths[0].length - a.paths[0].length
  );
  for (const mod of sorted) {
    const match = mod.paths.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    if (match) return access[mod.key] ?? "none";
  }
  return "none";
}

export function canAccessPath(
  pathname: string,
  role: Role,
  custom: ModuleAccessMap | null | undefined
): boolean {
  if (role === "ADMIN") return true;
  if (role === "CUSTOMER") return false;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const access = resolveModuleAccess(role, custom);
    return (access.dashboard ?? "none") !== "none";
  }
  const access = resolveModuleAccess(role, custom);
  return getAccessForPath(pathname, access) !== "none";
}

export function canEditPath(
  pathname: string,
  role: Role,
  custom: ModuleAccessMap | null | undefined
): boolean {
  if (role === "ADMIN") return true;
  const access = resolveModuleAccess(role, custom);
  return getAccessForPath(pathname, access) === "edit";
}

export function firstAllowedHref(
  role: Role,
  custom: ModuleAccessMap | null | undefined
): string {
  if (role === "CUSTOMER") return "/order";
  const access = resolveModuleAccess(role, custom);
  for (const mod of APP_MODULES) {
    if ((access[mod.key] ?? "none") !== "none") return mod.href;
  }
  return "/dashboard";
}

export function moduleKeyForHref(href: string): ModuleKey | null {
  const sorted = [...APP_MODULES].sort(
    (a, b) => b.href.length - a.href.length
  );
  for (const mod of sorted) {
    if (href === mod.href || href.startsWith(`${mod.href}/`)) return mod.key;
  }
  return null;
}

/** Map API routes to modules for view/edit enforcement. */
const API_MODULE_PREFIXES: Array<{ prefix: string; key: ModuleKey }> = [
  { prefix: "/api/medicines", key: "medicines" },
  { prefix: "/api/batches", key: "batches" },
  { prefix: "/api/inventory", key: "inventory" },
  { prefix: "/api/prescriptions", key: "prescriptions" },
  { prefix: "/api/customers", key: "customers" },
  { prefix: "/api/suppliers", key: "suppliers" },
  { prefix: "/api/purchases", key: "purchases" },
  { prefix: "/api/sales", key: "sales" },
  { prefix: "/api/returns", key: "returns" },
  { prefix: "/api/users", key: "users" },
  { prefix: "/api/audit", key: "users" },
  { prefix: "/api/settings", key: "settings" },
  { prefix: "/api/notifications", key: "notifications" },
  { prefix: "/api/reports", key: "reports" },
  { prefix: "/api/website/products", key: "website_products" },
  { prefix: "/api/website/orders", key: "website_orders" },
  { prefix: "/api/website/customers", key: "website_customers" },
  { prefix: "/api/barcode", key: "medicines" },
];

export function moduleKeyForApiPath(pathname: string): ModuleKey | null {
  const sorted = [...API_MODULE_PREFIXES].sort(
    (a, b) => b.prefix.length - a.prefix.length
  );
  for (const entry of sorted) {
    if (
      pathname === entry.prefix ||
      pathname.startsWith(`${entry.prefix}/`)
    ) {
      return entry.key;
    }
  }
  return null;
}

export function canMutateApi(
  pathname: string,
  method: string,
  role: Role,
  custom: ModuleAccessMap | null | undefined
): boolean {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return true;
  if (role === "ADMIN") return true;
  const key = moduleKeyForApiPath(pathname);
  if (!key) return true; // unmapped APIs keep existing auth
  const access = resolveModuleAccess(role, custom);
  return (access[key] ?? "none") === "edit";
}
