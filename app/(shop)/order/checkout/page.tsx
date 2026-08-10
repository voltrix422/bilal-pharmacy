"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useShopCart } from "@/stores/shop-cart";
import { formatCurrency } from "@/lib/utils/format";

type Profile = {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
};

async function loadProfile() {
  const res = await fetch("/api/website/me", { credentials: "include" });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || "Failed");
  return body.data as Profile;
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useShopCart((s) => s.items);
  const updateQty = useShopCart((s) => s.updateQty);
  const subtotal = useShopCart((s) => s.subtotal);
  const clear = useShopCart((s) => s.clear);

  const { data: profile } = useQuery({
    queryKey: ["website-me"],
    queryFn: loadProfile,
  });

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setCustomerName(profile.name || "");
    setCustomerPhone(profile.phone || "");
    setCustomerEmail(profile.email || "");
    setAddress(profile.address || "");
    setCity(profile.city || "");
  }, [profile]);

  const deliveryFee = subtotal() >= 2000 || subtotal() === 0 ? 0 : 150;
  const total = subtotal() + deliveryFee;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setSubmitting(true);
    try {
      const fullAddress = [houseNo.trim() && `House/Plot ${houseNo.trim()}`, address.trim()]
        .filter(Boolean)
        .join(", ");

      const res = await fetch("/api/website/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail: customerEmail || undefined,
          address: fullAddress || address,
          city: city || undefined,
          notes: notes || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || "Failed to place order");
      }
      clear();
      toast.success("Order placed");
      router.push(
        `/order/success?no=${encodeURIComponent(body.data.orderNumber)}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass =
    "mt-1 h-9 w-full rounded-md border border-[#d8e5dc] bg-[#f7faf8] px-2.5 text-sm text-[#1a2e22] outline-none transition placeholder:text-[#9aab9f] focus:border-[#1d9851] focus:bg-white focus:ring-1 focus:ring-[#1d9851]/20";

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="text-sm text-[#5a6f62]">Your cart is empty.</p>
        <Link
          href="/order"
          className="mt-3 inline-flex text-sm font-semibold text-[#1d9851]"
        >
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/order"
        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5a6f62] hover:text-[#1d9851]"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to shop
      </Link>

      <div className="mt-2 grid gap-3 lg:grid-cols-[1.2fr_0.9fr]">
        <form
          onSubmit={onSubmit}
          className="overflow-hidden rounded-xl border border-[#d8e5dc] bg-white"
        >
          <div className="border-b border-[#e4eee7] bg-[#f7faf8] px-4 py-3">
            <h1 className="text-base font-semibold tracking-tight text-[#1a2e22]">
              Checkout
            </h1>
            <p className="text-[11px] text-[#5a6f62]">
              Confirm details for this order.
            </p>
          </div>

          <div className="grid gap-2.5 px-4 py-3.5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-[11px] font-medium text-[#3d5246]">Name</span>
              <input
                required
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-medium text-[#3d5246]">Phone</span>
              <input
                required
                type="tel"
                inputMode="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+92 333 5618835"
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-medium text-[#3d5246]">Email</span>
              <input
                required
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-medium text-[#3d5246]">
                House / Plot no.
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={houseNo}
                onChange={(e) => setHouseNo(e.target.value)}
                placeholder="e.g. 19"
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-medium text-[#3d5246]">City</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Islamabad"
                className={fieldClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-[11px] font-medium text-[#3d5246]">
                Address
              </span>
              <input
                required
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, block, area"
                className={fieldClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-[11px] font-medium text-[#3d5246]">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Prescription pickup, timing, etc."
                className="mt-1 w-full resize-none rounded-md border border-[#d8e5dc] bg-[#f7faf8] px-2.5 py-2 text-sm outline-none transition focus:border-[#1d9851] focus:bg-white focus:ring-1 focus:ring-[#1d9851]/20"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-9 w-full items-center justify-center rounded-md bg-[#1d9851] text-sm font-semibold text-white hover:bg-[#178544] disabled:opacity-60 sm:col-span-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Placing order…
                </>
              ) : (
                "Place order"
              )}
            </button>
          </div>
        </form>

        <aside className="h-fit overflow-hidden rounded-xl border border-[#d8e5dc] bg-white">
          <div className="border-b border-[#e4eee7] bg-[#f7faf8] px-4 py-3">
            <h2 className="text-sm font-semibold text-[#1a2e22]">Your order</h2>
          </div>

          <ul className="divide-y divide-[#eef5f0] px-3 py-1">
            {items.map((i) => (
              <li key={i.productId} className="flex items-center gap-2.5 py-2.5">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[#eef5f0]">
                  {i.imageUrl ? (
                    <Image
                      src={i.imageUrl}
                      alt={i.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-[#1a2e22]">
                    {i.name}
                  </p>
                  <p className="text-[11px] text-[#6b8073]">
                    {formatCurrency(i.price)}
                  </p>
                </div>
                <label className="flex items-center gap-1">
                  <span className="sr-only">Quantity</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={i.quantity}
                    onChange={(e) => {
                      const n = Math.max(
                        1,
                        Math.min(99, Math.floor(Number(e.target.value) || 1))
                      );
                      updateQty(i.productId, n);
                    }}
                    className="h-8 w-14 rounded-md border border-[#d8e5dc] bg-[#f7faf8] px-1.5 text-center text-xs font-semibold tabular-nums outline-none focus:border-[#1d9851]"
                  />
                </label>
                <span className="w-16 text-right text-xs font-semibold tabular-nums text-[#1a2e22]">
                  {formatCurrency(i.price * i.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="space-y-1 border-t border-[#eef5f0] px-4 py-3 text-xs">
            <div className="flex justify-between">
              <span className="text-[#6b8073]">Subtotal</span>
              <span>{formatCurrency(subtotal())}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b8073]">Delivery</span>
              <span>
                {deliveryFee === 0 ? "Free" : formatCurrency(deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between pt-1 text-sm font-semibold">
              <span>Total</span>
              <span className="text-[#1d9851]">{formatCurrency(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
