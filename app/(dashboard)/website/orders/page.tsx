"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

type OnlineOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  address: string;
  city: string | null;
  notes: string | null;
  status: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  customerUser: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    createdAt: string;
  } | null;
};

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "DELIVERED",
  "CANCELLED",
] as const;

async function loadOrders(q: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const res = await fetch(`/api/website/orders?${params}`, {
    credentials: "include",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || "Failed");
  return (body.data ?? []) as OnlineOrder[];
}

export default function WebsiteOrdersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["website-orders", q],
    queryFn: () => loadOrders(q),
    refetchInterval: 20_000,
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/website/orders/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Failed");
    },
    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["website-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-2">
      <PageHeader
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => qc.invalidateQueries({ queryKey: ["website-orders"] })}
          >
            Refresh
          </Button>
        }
      />

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search order #, name, phone, email…"
        className="h-8 max-w-sm text-xs"
      />

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading orders…</p>
        ) : data.length === 0 ? (
          <div className="rounded-md border border-border p-6 text-center text-xs text-muted-foreground">
            No website orders yet. Customers place orders after registering at
            /order.
          </div>
        ) : (
          data.map((order) => {
            const open = openId === order.id;
            return (
              <div
                key={order.id}
                className="rounded-md border border-border bg-card p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold">{order.orderNumber}</p>
                      <Badge variant="outline">{order.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {order.customerName} · {order.customerPhone}
                      {order.customerEmail ? ` · ${order.customerEmail}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {[order.address, order.city].filter(Boolean).join(", ")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end sm:text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(order.total)}
                    </p>
                    <Select
                      value={order.status}
                      onValueChange={(status) =>
                        update.mutate({ id: order.id, status })
                      }
                    >
                      <SelectTrigger className="mt-1 h-9 w-full text-xs sm:h-7 sm:w-[140px] sm:text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      className="mt-1 self-start text-xs font-medium text-primary sm:self-end sm:text-[10px]"
                      onClick={() => setOpenId(open ? null : order.id)}
                    >
                      {open ? "Hide details" : "Full details"}
                    </button>
                  </div>
                </div>

                <ul className="mt-2 space-y-0.5 border-t border-border pt-2 text-[11px] text-muted-foreground">
                  {order.items.map((item, idx) => (
                    <li key={`${order.id}-${idx}`}>
                      {item.quantity}× {item.name} · {formatCurrency(item.total)}
                    </li>
                  ))}
                </ul>

                {open ? (
                  <div className="mt-2 space-y-1 rounded border border-border bg-muted/30 p-2 text-[11px]">
                    <p>
                      <span className="text-muted-foreground">Subtotal:</span>{" "}
                      {formatCurrency(order.subtotal)} · Delivery{" "}
                      {formatCurrency(order.deliveryFee)}
                    </p>
                    {order.notes ? (
                      <p>
                        <span className="text-muted-foreground">Notes:</span>{" "}
                        {order.notes}
                      </p>
                    ) : null}
                    {order.customerUser ? (
                      <div className="border-t border-border pt-1">
                        <p className="font-medium">Linked account</p>
                        <p>
                          {order.customerUser.name} · {order.customerUser.email}
                        </p>
                        <p>
                          {order.customerUser.phone || "No phone"} ·{" "}
                          {[order.customerUser.address, order.customerUser.city]
                            .filter(Boolean)
                            .join(", ") || "No address"}
                        </p>
                        <p className="text-muted-foreground">
                          Registered{" "}
                          {formatDateTime(order.customerUser.createdAt)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        Guest-style order (no linked account)
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
