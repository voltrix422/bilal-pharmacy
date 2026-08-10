"use client";

import * as React from "react";
import {
  Minus,
  Pause,
  Plus,
  ShoppingCart,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePosCustomers } from "@/lib/hooks/useSales";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/stores/pos";

interface CartPanelProps {
  onCheckout: () => void;
  className?: string;
}

export function CartPanel({ onCheckout, className }: CartPanelProps) {
  const items = usePosStore((s) => s.items);
  const customer = usePosStore((s) => s.customer);
  const prescriptionId = usePosStore((s) => s.prescriptionId);
  const orderDiscount = usePosStore((s) => s.orderDiscount);
  const heldSales = usePosStore((s) => s.heldSales);
  const removeItem = usePosStore((s) => s.removeItem);
  const updateQty = usePosStore((s) => s.updateQty);
  const setDiscount = usePosStore((s) => s.setDiscount);
  const setOrderDiscount = usePosStore((s) => s.setOrderDiscount);
  const setCustomer = usePosStore((s) => s.setCustomer);
  const setPrescriptionId = usePosStore((s) => s.setPrescriptionId);
  const clear = usePosStore((s) => s.clear);
  const hold = usePosStore((s) => s.hold);
  const resume = usePosStore((s) => s.resume);
  const removeHeld = usePosStore((s) => s.removeHeld);
  const lineTotal = usePosStore((s) => s.lineTotal);
  const subtotal = usePosStore((s) => s.subtotal);
  const grandTotal = usePosStore((s) => s.grandTotal);
  const requiresPrescription = usePosStore((s) => s.requiresPrescription);

  const [customerQuery, setCustomerQuery] = React.useState("");
  const [showCustomers, setShowCustomers] = React.useState(false);
  const { data: customers = [] } = usePosCustomers(
    customerQuery,
    showCustomers || customerQuery.length > 0
  );

  const handleHold = () => {
    const id = hold();
    if (!id) {
      toast.error("Cart is empty");
      return;
    }
    toast.success("Sale held");
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-background",
        className
      )}
    >
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border px-2.5">
        <div className="flex items-center gap-1.5">
          <ShoppingCart className="h-3.5 w-3.5 text-[#1d9851]" strokeWidth={1.5} />
          <h2 className="text-xs font-semibold">Cart</h2>
          {items.length > 0 ? (
            <Badge
              variant="outline"
              className="h-4 border-[#1d9851]/40 px-1 text-[9px] text-[#1d9851]"
            >
              {items.length}
            </Badge>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-[11px] text-muted-foreground"
          disabled={items.length === 0}
          onClick={() => {
            clear();
            toast.message("Cart cleared");
          }}
        >
          Clear
        </Button>
      </div>

      <div className="space-y-1.5 border-b border-border px-2.5 py-2">
        {customer ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{customer.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {customer.loyaltyPoints} pts
                {customer.phone ? ` · ${customer.phone}` : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCustomer(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={customerQuery}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                setShowCustomers(true);
              }}
              onFocus={() => setShowCustomers(true)}
              placeholder="Customer name / phone"
              className="h-8 pl-7 text-xs"
            />
            {showCustomers && customers.length > 0 ? (
              <div className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-md border border-border bg-popover shadow-sm">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full flex-col px-2.5 py-1.5 text-left hover:bg-muted/60"
                    onClick={() => {
                      setCustomer(c);
                      setCustomerQuery("");
                      setShowCustomers(false);
                    }}
                  >
                    <span className="text-xs font-medium">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.phone || c.email || "—"} · {c.loyaltyPoints} pts
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {requiresPrescription() ? (
          <div className="space-y-1">
            <Label className="text-[10px] text-[#d4322a]">
              Prescription ID required
            </Label>
            <Input
              value={prescriptionId ?? ""}
              onChange={(e) =>
                setPrescriptionId(e.target.value.trim() || null)
              }
              placeholder="Prescription ID"
              className="h-8 border-[#d4322a]/35 text-xs"
            />
          </div>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {items.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center gap-1 px-3 text-center">
            <ShoppingCart
              className="h-6 w-6 text-muted-foreground/40"
              strokeWidth={1.25}
            />
            <p className="text-[11px] text-muted-foreground">
              Cart is empty — scan to add
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={`${item.medicineId}:${item.batchId ?? "auto"}`}
                className="px-2.5 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatCurrency(item.unitPrice)}
                      {item.requiresPrescription ? " · Rx" : ""}
                      {item.isControlled ? " · Ctrl" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:text-[#d4322a]"
                    onClick={() => removeItem(item.medicineId, item.batchId)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() =>
                        updateQty(
                          item.medicineId,
                          item.quantity - 1,
                          item.batchId
                        )
                      }
                    >
                      <Minus className="h-2.5 w-2.5" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateQty(
                          item.medicineId,
                          Number(e.target.value) || 1,
                          item.batchId
                        )
                      }
                      className="h-6 w-11 px-1 text-center text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() =>
                        updateQty(
                          item.medicineId,
                          item.quantity + 1,
                          item.batchId
                        )
                      }
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.discount || ""}
                      onChange={(e) =>
                        setDiscount(
                          item.medicineId,
                          Number(e.target.value) || 0,
                          item.batchId
                        )
                      }
                      placeholder="Disc"
                      className="h-6 w-14 px-1 text-[10px]"
                      title="Line discount"
                    />
                    <span className="min-w-[3.75rem] text-right text-xs font-semibold tabular-nums">
                      {formatCurrency(lineTotal(item))}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>

      {heldSales.length > 0 ? (
        <div className="border-t border-border px-2.5 py-1.5">
          <p className="mb-1 text-[10px] font-medium text-muted-foreground">
            Held
          </p>
          <div className="flex flex-wrap gap-1">
            {heldSales.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px]"
              >
                <button
                  type="button"
                  className="font-medium text-[#1d9851] hover:underline"
                  onClick={() => {
                    if (items.length > 0) {
                      toast.error("Clear or hold current cart first");
                      return;
                    }
                    resume(h.id);
                    toast.success(`Resumed ${h.label}`);
                  }}
                >
                  {h.label}
                </button>
                <button
                  type="button"
                  aria-label="Remove held sale"
                  onClick={() => removeHeld(h.id)}
                >
                  <X className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="shrink-0 space-y-1.5 border-t border-border bg-muted/20 px-2.5 py-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">{formatCurrency(subtotal())}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <Label htmlFor="order-discount" className="text-muted-foreground">
            Discount
          </Label>
          <Input
            id="order-discount"
            type="number"
            min={0}
            step="0.01"
            value={orderDiscount || ""}
            onChange={(e) => setOrderDiscount(Number(e.target.value) || 0)}
            className="h-7 w-24 text-right text-xs"
          />
        </div>
        <div className="flex items-end justify-between border-t border-border pt-1.5">
          <span className="text-xs font-semibold">Total</span>
          <span className="text-lg font-semibold tabular-nums leading-none text-[#1d9851]">
            {formatCurrency(grandTotal())}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_1.6fr] gap-1.5 pt-0.5">
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-1 text-xs"
            disabled={items.length === 0}
            onClick={handleHold}
          >
            <Pause className="h-3.5 w-3.5" />
            Hold
          </Button>
          <Button
            type="button"
            className="h-9 bg-[#1d9851] text-xs font-semibold text-white hover:bg-[#178544]"
            disabled={items.length === 0}
            onClick={onCheckout}
          >
            Pay · F4
          </Button>
        </div>
      </div>
    </div>
  );
}
