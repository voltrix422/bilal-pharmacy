"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

type Profile = {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: Array<{ name: string; quantity: number; total: number }>;
};

async function loadProfile() {
  const res = await fetch("/api/website/me", { credentials: "include" });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || "Failed");
  return body.data as Profile;
}

async function loadOrders() {
  const res = await fetch("/api/website/orders?mine=true", {
    credentials: "include",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || "Failed");
  return (body.data ?? []) as Order[];
}

export default function AccountPage() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["website-me"],
    queryFn: loadProfile,
  });
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["website-orders-mine"],
    queryFn: loadOrders,
  });

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name || "",
      phone: profile.phone || "",
      address: profile.address || "",
      city: profile.city || "",
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/website/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["website-me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d9851]">
          Account
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[#1a2e22]">
          Your details
        </h1>
        <p className="mt-1 text-xs text-[#6b8073]">{profile?.email}</p>

        <div className="mt-6 space-y-4">
          {(
            [
              ["Name", "name"],
              ["Phone", "phone"],
              ["Address", "address"],
              ["City", "city"],
            ] as const
          ).map(([label, key]) => (
            <label key={key} className="block">
              <span className="text-[11px] text-[#6b8073]">{label}</span>
              <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-1 h-10 w-full border-0 border-b border-[#c5d9cc] bg-transparent px-0 text-sm outline-none focus:border-[#1d9851]"
              />
            </label>
          ))}
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="h-10 rounded-md bg-[#1d9851] px-5 text-sm font-semibold text-white hover:bg-[#178544] disabled:opacity-60"
          >
            Save profile
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d9851]">
              Orders
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[#1a2e22]">
              Order history
            </h2>
          </div>
          <Link href="/order" className="text-xs font-semibold text-[#1d9851]">
            New order
          </Link>
        </div>

        <div className="mt-6 space-y-3">
          {isLoading ? (
            <p className="text-sm text-[#5a6f62]">Loading…</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-[#5a6f62]">No orders yet.</p>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-[#d8e5dc] bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{order.orderNumber}</p>
                    <p className="text-[11px] text-[#6b8073]">
                      {formatDateTime(order.createdAt)} · {order.status}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#1d9851]">
                    {formatCurrency(order.total)}
                  </p>
                </div>
                <ul className="mt-2 space-y-0.5 text-xs text-[#5a6f62]">
                  {order.items.map((item, idx) => (
                    <li key={`${order.id}-${idx}`}>
                      {item.quantity}× {item.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
