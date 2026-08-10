"use client";

import * as React from "react";
import {
  AlertTriangle,
  Package,
  ScanBarcode,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { usePosProducts, type PosProduct } from "@/lib/hooks/useSales";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/stores/pos";

interface ProductSearchProps {
  className?: string;
}

export function ProductSearch({ className }: ProductSearchProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [pendingControlled, setPendingControlled] =
    React.useState<PosProduct | null>(null);

  const addItem = usePosStore((s) => s.addItem);
  const { data: products = [], isLoading, isFetching } = usePosProducts(debounced);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const addProduct = React.useCallback(
    (product: PosProduct) => {
      if (product.totalStock <= 0) return;
      addItem({
        medicineId: product.id,
        batchId: null,
        name: product.name,
        unitPrice: product.sellingPrice,
        requiresPrescription: product.requiresPrescription,
        isControlled: product.isControlled,
        sku: product.sku,
        maxStock: product.totalStock,
        quantity: 1,
      });
      setQuery("");
      setDebounced("");
      inputRef.current?.focus();
    },
    [addItem]
  );

  const handleSelect = (product: PosProduct) => {
    if (product.isControlled) {
      setPendingControlled(product);
      return;
    }
    addProduct(product);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !query.trim()) return;
    e.preventDefault();
    const exact = products.find(
      (p) =>
        p.barcode?.toLowerCase() === query.trim().toLowerCase() ||
        p.sku.toLowerCase() === query.trim().toLowerCase()
    );
    if (exact) {
      handleSelect(exact);
      return;
    }
    if (products.length === 1) {
      handleSelect(products[0]);
    }
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-2", className)}>
      <div className="relative">
        <ScanBarcode className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#1d9851]" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scan barcode or search name / generic / SKU"
          className="h-9 border-border bg-background pl-8 pr-16 text-sm focus-visible:ring-[#1d9851]/40"
          autoComplete="off"
          aria-label="Product search"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          {isFetching ? (
            <span className="text-[10px] text-muted-foreground">…</span>
          ) : null}
          <kbd className="rounded border border-border px-1 py-px font-mono text-[10px] text-muted-foreground">
            F2
          </kbd>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-border p-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-2">
                <Skeleton className="h-8 flex-1" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-1.5 px-4 text-center">
            <Package className="h-7 w-7 text-muted-foreground/50" strokeWidth={1.25} />
            <p className="text-xs font-medium text-foreground">
              {debounced ? "No products found" : "No stock available"}
            </p>
            <p className="max-w-[220px] text-[11px] text-muted-foreground">
              {debounced
                ? "Try another name, barcode, or SKU."
                : "In-stock medicines from Inventory will appear here."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {products.map((product) => {
              const out = product.totalStock <= 0;
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    disabled={out}
                    onClick={() => handleSelect(product)}
                    className={cn(
                      "flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors",
                      out
                        ? "cursor-not-allowed opacity-45"
                        : "hover:bg-[#1d9851]/[0.06] focus-visible:bg-[#1d9851]/[0.08] focus-visible:outline-none"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-medium leading-tight">
                          {product.name}
                        </p>
                        {product.isControlled ? (
                          <ShieldAlert className="h-3 w-3 shrink-0 text-[#d4322a]" />
                        ) : null}
                        {product.requiresPrescription ? (
                          <Badge
                            variant="outline"
                            className="h-4 border-[#d4322a]/40 px-1 text-[9px] text-[#d4322a]"
                          >
                            Rx
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {product.genericName ? `${product.genericName} · ` : ""}
                        {product.sku}
                        {product.barcode ? ` · ${product.barcode}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold tabular-nums text-[#1d9851]">
                        {formatCurrency(product.sellingPrice)}
                      </p>
                      <p
                        className={cn(
                          "text-[10px] tabular-nums",
                          product.totalStock <= 5
                            ? "text-[#d4322a]"
                            : "text-muted-foreground"
                        )}
                      >
                        {product.totalStock} stk
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingControlled)}
        onOpenChange={(open) => {
          if (!open) setPendingControlled(null);
        }}
        title="Controlled substance"
        description={
          <div className="space-y-2 text-sm">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#d4322a]" />
              <span>
                <strong>{pendingControlled?.name}</strong> is a controlled
                medicine. Confirm identity and prescription before dispensing.
              </span>
            </p>
          </div>
        }
        confirmLabel="Add to cart"
        variant="destructive"
        onConfirm={() => {
          if (pendingControlled) addProduct(pendingControlled);
          setPendingControlled(null);
        }}
      />
    </div>
  );
}
