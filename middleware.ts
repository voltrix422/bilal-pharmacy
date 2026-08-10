import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  canAccessPath,
  canMutateApi,
  firstAllowedHref,
  parseModuleAccess,
  type ModuleAccessMap,
} from "@/lib/permissions/modules";

type Role = "ADMIN" | "PHARMACIST" | "CASHIER" | "MANAGER" | "CUSTOMER";

const PUBLIC_PREFIXES = [
  "/login",
  "/order",
  "/about",
  "/contact",
  "/api/auth",
  "/api/cron",
];

const CUSTOMER_ONLY_SHOP = ["/order/checkout", "/order/account"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isCustomerOnlyShop(pathname: string) {
  return CUSTOMER_ONLY_SHOP.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function defaultRouteForRole(
  role: Role,
  moduleAccess?: ModuleAccessMap | null
): string {
  if (role === "CUSTOMER") return "/order";
  return firstAllowedHref(role, moduleAccess ?? null);
}

function isShopAuthPage(pathname: string) {
  return (
    pathname === "/order/login" ||
    pathname.startsWith("/order/login/") ||
    pathname === "/order/register" ||
    pathname.startsWith("/order/register/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  });

  const isAuthenticated = Boolean(token?.id || token?.sub);
  const role = (token?.role as Role | undefined) ?? "CASHIER";
  const moduleAccess =
    parseModuleAccess(token?.moduleAccess) ??
    (token?.moduleAccess as ModuleAccessMap | null | undefined) ??
    null;

  if (pathname === "/") {
    if (isAuthenticated && role !== "CUSTOMER") {
      return NextResponse.redirect(
        new URL(defaultRouteForRole(role, moduleAccess), request.url)
      );
    }
    return NextResponse.next();
  }

  if (pathname === "/order" || pathname.startsWith("/order/")) {
    if (isShopAuthPage(pathname)) {
      if (isAuthenticated && role === "CUSTOMER") {
        return NextResponse.redirect(new URL("/order", request.url));
      }
      return NextResponse.next();
    }

    if (isCustomerOnlyShop(pathname)) {
      if (!isAuthenticated) {
        const loginUrl = new URL("/order/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
      if (role !== "CUSTOMER") {
        return NextResponse.redirect(
          new URL(defaultRouteForRole(role, moduleAccess), request.url)
        );
      }
    }

    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    if (isAuthenticated && pathname.startsWith("/login")) {
      return NextResponse.redirect(
        new URL(defaultRouteForRole(role, moduleAccess), request.url)
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const isPublicShopApi =
      (pathname === "/api/website/products" && request.method === "GET") ||
      (pathname.startsWith("/api/website/products/") &&
        request.method === "GET") ||
      (pathname === "/api/website/register" && request.method === "POST");

    if (isPublicShopApi) {
      return NextResponse.next();
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    if (!canMutateApi(pathname, request.method, role, moduleAccess)) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "View-only access — editing is not allowed" },
        },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (role === "CUSTOMER") {
    return NextResponse.redirect(new URL("/order", request.url));
  }

  if (!canAccessPath(pathname, role, moduleAccess)) {
    return NextResponse.redirect(
      new URL(defaultRouteForRole(role, moduleAccess), request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
