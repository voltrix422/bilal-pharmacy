"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils/format";

type WebsiteCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  _count: { onlineOrders: number };
};

async function loadCustomers(q: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const res = await fetch(`/api/website/customers?${params}`, {
    credentials: "include",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || "Failed");
  return (body.data ?? []) as WebsiteCustomer[];
}

export default function WebsiteCustomersPage() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["website-customers", q],
    queryFn: () => loadCustomers(q),
  });

  return (
    <div className="space-y-2">
      <PageHeader />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, email, phone…"
        className="h-8 max-w-sm text-xs"
      />

      <div className="rounded-md border border-border bg-card">
        <div className="divide-y divide-border">
          {isLoading ? (
            <p className="p-3 text-xs text-muted-foreground">Loading…</p>
          ) : data.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">
              No website customer accounts yet.
            </p>
          ) : (
            data.map((c) => (
              <div key={c.id} className="px-3 py-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.email}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {[c.address, c.city].filter(Boolean).join(", ") ||
                        "No address"}
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-muted-foreground">
                    <p>{c._count.onlineOrders} orders</p>
                    <p>Joined {formatDateTime(c.createdAt)}</p>
                    {c.lastLogin ? (
                      <p>Last login {formatDateTime(c.lastLogin)}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
