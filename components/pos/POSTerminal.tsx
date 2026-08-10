"use client";

import * as React from "react";
import { Keyboard, PauseCircle, Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductSearch } from "@/components/pos/ProductSearch";
import { CartPanel } from "@/components/pos/CartPanel";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ReceiptPrinter } from "@/components/pos/ReceiptPrinter";
import { useCheckout } from "@/lib/hooks/useSales";
import { usePosStore } from "@/stores/pos";
import { cn } from "@/lib/utils";
import type { SaleDTO } from "@/types";

export function POSTerminal() {
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [receiptSale, setReceiptSale] = React.useState<SaleDTO | null>(null);
  const [receiptOpen, setReceiptOpen] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<"search" | "cart">("search");

  const items = usePosStore((s) => s.items);
  const customer = usePosStore((s) => s.customer);
  const prescriptionId = usePosStore((s) => s.prescriptionId);
  const orderDiscount = usePosStore((s) => s.orderDiscount);
  const notes = usePosStore((s) => s.notes);
  const heldSales = usePosStore((s) => s.heldSales);
  const hold = usePosStore((s) => s.hold);
  const clear = usePosStore((s) => s.clear);
  const requiresPrescription = usePosStore((s) => s.requiresPrescription);

  const checkout = useCheckout();

  const openPayment = React.useCallback(() => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (requiresPrescription() && !prescriptionId) {
      toast.error("Add a prescription ID for Rx medicines");
      return;
    }
    setPaymentOpen(true);
  }, [items.length, prescriptionId, requiresPrescription]);

  const holdOnServer = React.useCallback(async () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    try {
      await checkout.mutateAsync({
        customerId: customer?.id ?? null,
        prescriptionId: prescriptionId ?? null,
        paymentMethod: "CASH",
        discount: orderDiscount,
        amountPaid: 0,
        notes: notes || "Held sale",
        isHeld: true,
        items: items.map((item) => ({
          medicineId: item.medicineId,
          batchId: item.batchId ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
      });
      clear();
      toast.success("Sale held (saved as pending)");
    } catch (err) {
      const id = hold();
      if (id) {
        toast.message(
          err instanceof Error
            ? `Held locally: ${err.message}`
            : "Held locally"
        );
      }
    }
  }, [
    checkout,
    clear,
    customer?.id,
    hold,
    items,
    notes,
    orderDiscount,
    prescriptionId,
  ]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "F4") {
        e.preventDefault();
        openPayment();
      }
      if (e.key === "F3") {
        e.preventDefault();
        void holdOnServer();
      }
      if (e.key === "Escape" && !typing) {
        setPaymentOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [holdOnServer, openPayment]);

  return (
    <div
      data-pos-terminal
      className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col bg-background sm:h-[calc(100vh-2.5rem)] sm:min-h-[520px]"
    >
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border px-2.5 sm:h-9">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-[#1d9851] sm:text-xs">
            POS
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
            Scan · search · checkout
          </span>
          {heldSales.length > 0 ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              {heldSales.length} held
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="hidden items-center gap-1 text-[10px] text-muted-foreground md:flex">
            <Keyboard className="h-3 w-3" strokeWidth={1.5} />
            <kbd className="rounded border border-border px-1 py-px font-mono">
              F2
            </kbd>
            <span>search</span>
            <kbd className="rounded border border-border px-1 py-px font-mono">
              F3
            </kbd>
            <span>hold</span>
            <kbd className="rounded border border-border px-1 py-px font-mono">
              F4
            </kbd>
            <span>pay</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2.5 text-xs sm:h-7 sm:text-[11px]"
            onClick={() => void holdOnServer()}
            disabled={items.length === 0}
          >
            <PauseCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
            Hold
          </Button>
        </div>
      </header>

      {/* Mobile: Search / Cart tabs */}
      <div className="flex shrink-0 border-b border-border lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("search")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium",
            mobileTab === "search"
              ? "border-b-2 border-[#1d9851] text-[#1d9851]"
              : "text-muted-foreground"
          )}
        >
          <Search className="h-4 w-4" strokeWidth={1.75} />
          Search
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("cart")}
          className={cn(
            "relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium",
            mobileTab === "cart"
              ? "border-b-2 border-[#1d9851] text-[#1d9851]"
              : "text-muted-foreground"
          )}
        >
          <ShoppingCart className="h-4 w-4" strokeWidth={1.75} />
          Cart
          {items.length > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1d9851] px-1 text-[10px] font-semibold text-white">
              {items.length}
            </span>
          ) : null}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]">
        <section
          className={cn(
            "min-h-0 border-border p-2 lg:border-b-0 lg:border-r",
            mobileTab === "search" ? "flex flex-col" : "hidden lg:flex lg:flex-col"
          )}
        >
          <ProductSearch />
        </section>
        <aside
          className={cn(
            "min-h-0",
            mobileTab === "cart" ? "flex flex-col" : "hidden lg:flex lg:flex-col"
          )}
        >
          <CartPanel
            onCheckout={() => {
              setMobileTab("cart");
              openPayment();
            }}
          />
        </aside>
      </div>

      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onSuccess={(sale) => {
          setReceiptSale(sale);
          setReceiptOpen(true);
        }}
      />

      <ReceiptPrinter
        sale={receiptSale}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </div>
  );
}
