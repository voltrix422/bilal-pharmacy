"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/format";

type WebsiteProduct = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  unitLabel: string;
  isActive: boolean;
  requiresPrescription: boolean;
  description: string | null;
  imageUrl: string | null;
};

type FormState = {
  name: string;
  category: string;
  price: string;
  unitLabel: string;
  description: string;
  imageUrl: string;
  requiresPrescription: boolean;
};

const emptyForm: FormState = {
  name: "",
  category: "General",
  price: "",
  unitLabel: "pack",
  description: "",
  imageUrl: "",
  requiresPrescription: false,
};

async function loadProducts() {
  const res = await fetch("/api/website/products", { credentials: "include" });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || "Failed");
  return (body.data ?? []) as WebsiteProduct[];
}

export default function WebsiteProductsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["website-products-admin"],
    queryFn: loadProducts,
  });

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(p: WebsiteProduct) {
    setEditId(p.id);
    setForm({
      name: p.name,
      category: p.category,
      price: String(p.price),
      unitLabel: p.unitLabel,
      description: p.description || "",
      imageUrl: p.imageUrl || "",
      requiresPrescription: p.requiresPrescription,
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        price: Number(form.price),
        imageUrl: form.imageUrl || null,
      };
      const res = await fetch(
        editId ? `/api/website/products/${editId}` : "/api/website/products",
        {
          method: editId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      toast.success(editId ? "Product updated" : "Product added to website");
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["website-products-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/website/products/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Failed");
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["website-products-admin"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-2">
      <PageHeader
        actions={
          <Button type="button" onClick={openCreate}>
            Add website product
          </Button>
        }
      />

      <div className="rounded-md border border-border bg-card">
        <div className="divide-y divide-border">
          {isLoading ? (
            <p className="p-3 text-xs text-muted-foreground">Loading…</p>
          ) : data.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">
              No website products yet.
            </p>
          ) : (
            data.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {p.imageUrl ? (
                      <Image
                        src={p.imageUrl}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.category} · {formatCurrency(p.price)} · {p.unitLabel}
                      {p.requiresPrescription ? " · Rx" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={() => openEdit(p)}
                  >
                    Edit
                  </Button>
                  <span className="text-[10px] text-muted-foreground">
                    {p.isActive ? "Live" : "Hidden"}
                  </span>
                  <Switch
                    checked={p.isActive}
                    onCheckedChange={(checked) =>
                      toggle.mutate({ id: p.id, isActive: checked })
                    }
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit website product" : "Add website product"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Unit label</Label>
              <Input
                value={form.unitLabel}
                onChange={(e) =>
                  setForm({ ...form, unitLabel: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input
                value={form.imageUrl}
                onChange={(e) =>
                  setForm({ ...form, imageUrl: e.target.value })
                }
                placeholder="https://images.unsplash.com/..."
              />
              {form.imageUrl ? (
                <div className="relative mt-2 h-24 w-24 overflow-hidden rounded-md border">
                  <Image
                    src={form.imageUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-xs">
              <Switch
                checked={form.requiresPrescription}
                onCheckedChange={(checked) =>
                  setForm({ ...form, requiresPrescription: checked })
                }
              />
              Requires prescription
            </label>
            <Button
              type="button"
              className="w-full"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              {editId ? "Save changes" : "Save product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
