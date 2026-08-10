"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useShopCart } from "@/stores/shop-cart";
import { cn } from "@/lib/utils";

export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const cartCount = useShopCart((s) => s.count());
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const onHero = transparent && pathname === "/" && !menuOpen;
  const isCustomer =
    status === "authenticated" && session?.user?.role === "CUSTOMER";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const linkClass = (active: boolean) =>
    cn(
      "rounded-md px-2.5 py-1.5 text-sm font-medium transition sm:px-3",
      onHero
        ? "text-white/90 hover:bg-white/10 hover:text-white"
        : active
          ? "bg-[#e8f5ee] text-[#1d9851]"
          : "text-[#3d5246] hover:bg-[#eef5f0] hover:text-[#1d9851]"
    );

  const mobileLink = (href: string, label: string) => (
    <Link
      href={href}
      onClick={() => setMenuOpen(false)}
      className={cn(
        "rounded-lg px-3 py-3 text-base font-medium",
        pathname === href || (href !== "/" && pathname.startsWith(href))
          ? "bg-[#e8f5ee] text-[#1d9851]"
          : "text-[#1a2e22] hover:bg-[#eef5f0]"
      )}
    >
      {label}
    </Link>
  );

  return (
    <header
      className={cn(
        "z-30 border-b backdrop-blur-md",
        onHero
          ? "absolute inset-x-0 top-0 border-transparent bg-transparent"
          : "sticky top-0 border-[#d8e5dc] bg-[#f7faf8]/95"
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-3 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <Image
            src="/bilal-pharmacy-mark.png"
            alt="Bilal Pharmacy"
            width={36}
            height={36}
            className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
            priority
          />
          <span
            className={cn(
              "truncate text-sm font-semibold tracking-tight sm:text-[15px]",
              onHero ? "text-white" : "text-[#1a2e22]"
            )}
          >
            Bilal Pharmacy
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/about" className={linkClass(pathname === "/about")}>
            About
          </Link>
          <Link
            href="/order"
            className={linkClass(pathname.startsWith("/order"))}
          >
            Shop
          </Link>
          <Link
            href="/contact"
            className={linkClass(pathname === "/contact")}
          >
            Contact
          </Link>

          <Link
            href="/order/cart"
            className={cn(
              "relative ml-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md transition",
              onHero
                ? "text-white hover:bg-white/10"
                : "text-[#1a2e22] hover:bg-[#eef5f0]"
            )}
            aria-label="Cart"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
            {mounted && cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1d9851] px-1 text-[9px] font-semibold text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>

          {mounted && isCustomer ? (
            <>
              <Link
                href="/order/account"
                className={linkClass(pathname === "/order/account")}
              >
                Account
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className={cn(
                  "ml-1 inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition",
                  onHero
                    ? "border-white/30 text-white hover:bg-white/10"
                    : "border-[#c5d9cc] text-[#1a2e22] hover:border-[#1d9851] hover:text-[#1d9851]"
                )}
              >
                Sign out
              </button>
            </>
          ) : null}
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <Link
            href="/order/cart"
            className={cn(
              "relative inline-flex h-9 w-9 items-center justify-center rounded-md transition",
              onHero
                ? "text-white hover:bg-white/10"
                : "text-[#1a2e22] hover:bg-[#eef5f0]"
            )}
            aria-label="Cart"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
            {mounted && cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1d9851] px-1 text-[9px] font-semibold text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-md",
              onHero
                ? "text-white hover:bg-white/10"
                : "text-[#1a2e22] hover:bg-[#eef5f0]"
            )}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-[#d8e5dc] bg-[#f7faf8] md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {mobileLink("/about", "About")}
            {mobileLink("/order", "Shop")}
            {mobileLink("/contact", "Contact")}
            {mounted && isCustomer ? (
              <>
                {mobileLink("/order/account", "Account")}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="rounded-lg px-3 py-3 text-left text-base font-medium text-[#1a2e22] hover:bg-[#eef5f0]"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                {mobileLink("/order/login", "Sign in")}
                {mobileLink("/order/register", "Create account")}
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
