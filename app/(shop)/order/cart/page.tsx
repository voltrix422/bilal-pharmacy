"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import { ShopAuthPrompt } from "@/components/marketing/ShopAuthPrompt";
import { useShopCart } from "@/stores/shop-cart";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export default function CartPage() {
  const { data: session } = useSession();
  const isCustomer = session?.user?.role === "CUSTOMER";
  const [authOpen, setAuthOpen] = useState(false);
  const items = useShopCart((s) => s.items);
  const updateQty = useShopCart((s) => s.updateQty);
  const removeItem = useShopCart((s) => s.removeItem);
  const clear = useShopCart((s) => s.clear);
  const subtotal = useShopCart((s) => s.subtotal);
  const deliveryFee = subtotal() >= 2000 || subtotal() === 0 ? 0 : 150;
  const total = subtotal() + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-semibold text-[#1a2e22]">Your cart</h1>
        <p className="mt-2 text-sm text-[#5a6f62]">No medicines added yet.</p>
        <Link
          href="/order"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-[#1d9851] px-5 text-sm font-semibold text-white hover:bg-[#178544]"
        >
          Browse products
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-4 sm:gap-8 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1a2e22] sm:text-2xl">Your cart</h1>
          </div>
          <button
            type="button"
            onClick={() => clear()}
            className="text-xs text-[#6b8073] hover:text-[#d4322a]"
          >
            Clear all
          </button>
        </div>

        <ul className="mt-6 divide-y divide-[#d8e5dc] border-y border-[#d8e5dc]">
          {items.map((item) => (
            <li key={item.productId} className="flex gap-3 py-4">
              <Link
                href={item.slug ? `/order/product/${item.slug}` : "/order"}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#eef5f0]"
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : null}
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={item.slug ? `/order/product/${item.slug}` : "/order"}
                  className="text-sm font-semibold text-[#1a2e22] hover:underline"
                >
                  {item.name}
                </Link>
                <p className="mt-0.5 text-xs text-[#6b8073]">
                  {formatCurrency(item.price)} / {item.unitLabel}
                  {item.requiresPrescription ? " · Rx" : ""}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[#c5d9cc]"
                    onClick={() => updateQty(item.productId, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[#c5d9cc]"
                    onClick={() => updateQty(item.productId, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="ml-2 text-[#6b8073] hover:text-[#d4322a]"
                    onClick={() => removeItem(item.productId)}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {formatCurrency(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <aside className="h-fit rounded-2xl border border-[#d8e5dc] bg-white p-4">
        <h2 className="text-sm font-semibold">Summary</h2>
        <div className="mt-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-[#6b8073]">Subtotal</span>
            <span>{formatCurrency(subtotal())}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6b8073]">Delivery</span>
            <span>{deliveryFee === 0 ? "Free" : formatCurrency(deliveryFee)}</span>
          </div>
          <div className="flex justify-between border-t border-[#eef5f0] pt-2 text-sm font-semibold">
            <span>Total</span>
            <span className="text-[#1d9851]">{formatCurrency(total)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!isCustomer) {
              setAuthOpen(true);
              return;
            }
            window.location.href = "/order/checkout";
          }}
          className={cn(
            "mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#1d9851] text-sm font-semibold text-white hover:bg-[#178544]"
          )}
        >
          {isCustomer ? "Checkout" : "Buy — create account"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </aside>

      <ShopAuthPrompt
        open={authOpen}
        onOpenChange={setAuthOpen}
        callbackUrl="/order/checkout"
      />
    </div>
  );
}
