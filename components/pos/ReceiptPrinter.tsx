"use client";

import * as React from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { downloadReceiptPdf, type ReceiptData } from "@/lib/utils/pdf";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { SaleDTO } from "@/types";

function saleToReceipt(sale: SaleDTO, extras?: Partial<ReceiptData>): ReceiptData {
  return {
    saleNumber: sale.saleNumber,
    createdAt: sale.createdAt,
    cashierName: sale.cashier?.name,
    customerName: sale.customer?.name,
    paymentMethod: sale.paymentMethod,
    items: (sale.items ?? []).map((item) => ({
      name: item.medicine?.name ?? "Item",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      total: item.total,
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    total: sale.total,
    amountPaid: sale.amountPaid,
    change: sale.change,
    loyaltyEarned: sale.loyaltyEarned,
    loyaltyRedeemed: sale.loyaltyRedeemed,
    pharmacyName: "Bilal Pharmacy",
    footer:
      "Thank you for choosing Bilal Pharmacy.\nMedicines once sold are not returnable without prescription.",
    ...extras,
  };
}

interface ReceiptPrinterProps {
  sale: SaleDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptPrinter({
  sale,
  open,
  onOpenChange,
}: ReceiptPrinterProps) {
  const printRef = React.useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = React.useState(false);

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
    if (!win) {
      toast.error("Pop-up blocked. Allow pop-ups to print.");
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt ${sale?.saleNumber ?? ""}</title>
      <style>
        body { font-family: ui-monospace, monospace; font-size: 12px; padding: 16px; color: #0f172a; }
        h1 { color: #0f766e; font-size: 18px; margin: 0 0 4px; text-align: center; }
        .muted { color: #64748b; text-align: center; margin-bottom: 12px; }
        .row { display: flex; justify-content: space-between; margin: 2px 0; }
        .items { margin: 12px 0; border-top: 1px dashed #94a3b8; border-bottom: 1px dashed #94a3b8; padding: 8px 0; }
        .total { font-weight: 700; font-size: 14px; color: #0f766e; }
        .footer { text-align: center; margin-top: 16px; color: #64748b; white-space: pre-line; }
        @media print { body { padding: 0; } }
      </style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const handlePdf = async () => {
    if (!sale) return;
    try {
      setDownloading(true);
      await downloadReceiptPdf(saleToReceipt(sale));
      toast.success("Receipt PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Receipt</DialogTitle>
        </DialogHeader>

        <div
          ref={printRef}
          className="rounded-lg border bg-white p-4 font-mono text-xs text-foreground"
        >
          <h1 className="text-center font-sans text-lg font-semibold text-pharmacy-700">
            Bilal Pharmacy
          </h1>
          <p className="muted mb-3 text-center text-muted-foreground">
            Your Health, Our Priority
          </p>

          <div className="space-y-1">
            <div className="row flex justify-between">
              <span>Sale #</span>
              <span>{sale.saleNumber}</span>
            </div>
            <div className="row flex justify-between">
              <span>Date</span>
              <span>{formatDateTime(sale.createdAt)}</span>
            </div>
            {sale.cashier?.name ? (
              <div className="row flex justify-between">
                <span>Cashier</span>
                <span>{sale.cashier.name}</span>
              </div>
            ) : null}
            {sale.customer?.name ? (
              <div className="row flex justify-between">
                <span>Customer</span>
                <span>{sale.customer.name}</span>
              </div>
            ) : null}
            <div className="row flex justify-between">
              <span>Payment</span>
              <span>{sale.paymentMethod.replace("_", " ")}</span>
            </div>
          </div>

          <div className="items my-3 space-y-2 border-y border-dashed py-2">
            {(sale.items ?? []).map((item) => (
              <div key={item.id}>
                <div className="font-medium">
                  {item.medicine?.name ?? "Item"}
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 ? (
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            ) : null}
            {sale.tax > 0 ? (
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(sale.tax)}</span>
              </div>
            ) : null}
            <Separator className="my-1" />
            <div className="total flex justify-between text-sm font-bold text-pharmacy-700">
              <span>Total</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid</span>
              <span>{formatCurrency(sale.amountPaid)}</span>
            </div>
            {sale.change > 0 ? (
              <div className="flex justify-between">
                <span>Change</span>
                <span>{formatCurrency(sale.change)}</span>
              </div>
            ) : null}
            {sale.loyaltyEarned > 0 ? (
              <div className="flex justify-between">
                <span>Loyalty earned</span>
                <span>{sale.loyaltyEarned} pts</span>
              </div>
            ) : null}
          </div>

          <p className="footer mt-4 whitespace-pre-line text-center text-[10px] text-muted-foreground">
            Thank you for choosing Bilal Pharmacy.{"\n"}
            Medicines once sold are not returnable without prescription.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={handlePrint} className="gap-1">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            type="button"
            variant="primary"
            className="gap-1"
            onClick={() => void handlePdf()}
            disabled={downloading}
          >
            <Download className="h-4 w-4" />
            {downloading ? "Preparing…" : "Download PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { saleToReceipt };
