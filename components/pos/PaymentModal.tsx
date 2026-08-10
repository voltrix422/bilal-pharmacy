"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreditCard, Banknote, Shield, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCheckout } from "@/lib/hooks/useSales";
import { formatCurrency } from "@/lib/utils/format";
import { usePosStore } from "@/stores/pos";
import type { SaleDTO } from "@/types";
import { cn } from "@/lib/utils";

const paymentSchema = z
  .object({
    paymentMethod: z.enum(["CASH", "CARD", "INSURANCE", "MOBILE_PAYMENT"]),
    amountPaid: z.coerce.number().min(0),
    loyaltyRedeemed: z.coerce.number().int().min(0).default(0),
    insurancePolicyNumber: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.paymentMethod === "INSURANCE" &&
      !data.insurancePolicyNumber?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Policy number is required",
        path: ["insurancePolicyNumber"],
      });
    }
  });

type PaymentForm = z.infer<typeof paymentSchema>;

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (sale: SaleDTO) => void;
}

const METHODS = [
  { value: "CASH" as const, label: "Cash", icon: Banknote },
  { value: "CARD" as const, label: "Card", icon: CreditCard },
  { value: "INSURANCE" as const, label: "Insurance", icon: Shield },
  { value: "MOBILE_PAYMENT" as const, label: "Mobile", icon: Smartphone },
];

const REDEMPTION_RATE = 100; // points per 1 currency unit

export function PaymentModal({
  open,
  onOpenChange,
  onSuccess,
}: PaymentModalProps) {
  const items = usePosStore((s) => s.items);
  const customer = usePosStore((s) => s.customer);
  const prescriptionId = usePosStore((s) => s.prescriptionId);
  const orderDiscount = usePosStore((s) => s.orderDiscount);
  const notes = usePosStore((s) => s.notes);
  const grandTotal = usePosStore((s) => s.grandTotal);
  const clear = usePosStore((s) => s.clear);
  const requiresPrescription = usePosStore((s) => s.requiresPrescription);

  const checkout = useCheckout();
  const baseTotal = grandTotal();

  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "CASH",
      amountPaid: baseTotal,
      loyaltyRedeemed: 0,
      insurancePolicyNumber: customer?.insuranceNumber ?? "",
      notes: notes || "",
    },
  });

  const paymentMethod = form.watch("paymentMethod");
  const amountPaid = form.watch("amountPaid");
  const loyaltyRedeemed = form.watch("loyaltyRedeemed") || 0;

  const loyaltyDiscount =
    loyaltyRedeemed > 0 ? loyaltyRedeemed / REDEMPTION_RATE : 0;
  const payable = Math.max(0, baseTotal - loyaltyDiscount);
  const change =
    paymentMethod === "CASH" ? Math.max(0, (amountPaid || 0) - payable) : 0;

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      paymentMethod: "CASH",
      amountPaid: baseTotal,
      loyaltyRedeemed: 0,
      insurancePolicyNumber: customer?.insuranceNumber ?? "",
      notes: notes || "",
    });
  }, [open, baseTotal, customer, notes, form]);

  React.useEffect(() => {
    if (paymentMethod !== "CASH") {
      form.setValue("amountPaid", payable);
    }
  }, [paymentMethod, payable, form]);

  const maxRedeemable = customer
    ? Math.min(
        customer.loyaltyPoints,
        Math.floor(baseTotal * REDEMPTION_RATE)
      )
    : 0;

  const onSubmit = form.handleSubmit(async (values) => {
    if (requiresPrescription() && !prescriptionId) {
      toast.error("Prescription ID is required for Rx medicines");
      return;
    }

    const finalPayable = Math.max(
      0,
      baseTotal - (values.loyaltyRedeemed || 0) / REDEMPTION_RATE
    );

    if (
      values.paymentMethod === "CASH" &&
      values.amountPaid < finalPayable
    ) {
      toast.error("Cash received is less than total due");
      return;
    }

    try {
      const sale = await checkout.mutateAsync({
        customerId: customer?.id ?? null,
        prescriptionId: prescriptionId ?? null,
        paymentMethod: values.paymentMethod,
        discount: orderDiscount,
        amountPaid:
          values.paymentMethod === "CASH" ? values.amountPaid : finalPayable,
        loyaltyRedeemed: values.loyaltyRedeemed || 0,
        insurancePolicyNumber: values.insurancePolicyNumber,
        notes: values.notes,
        isHeld: false,
        items: items.map((item) => ({
          medicineId: item.medicineId,
          batchId: item.batchId ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
      });

      clear();
      onOpenChange(false);
      toast.success(`Sale ${sale.saleNumber} completed`);
      onSuccess(sale);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-pharmacy-900">
            Payment
          </DialogTitle>
          <DialogDescription>
            Total due{" "}
            <span className="font-semibold text-pharmacy-700">
              {formatCurrency(payable)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <Tabs
            value={paymentMethod}
            onValueChange={(v) =>
              form.setValue(
                "paymentMethod",
                v as PaymentForm["paymentMethod"]
              )
            }
          >
            <TabsList className="grid h-auto w-full grid-cols-4">
              {METHODS.map((m) => (
                <TabsTrigger
                  key={m.value}
                  value={m.value}
                  className="flex flex-col gap-1 py-2 data-[state=active]:bg-[#1d9851] data-[state=active]:text-white"
                >
                  <m.icon className="h-4 w-4" />
                  <span className="text-[10px] sm:text-xs">{m.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {paymentMethod === "CASH" ? (
            <div className="space-y-2">
              <Label htmlFor="amountPaid">Cash received</Label>
              <Input
                id="amountPaid"
                type="number"
                step="0.01"
                min={0}
                autoFocus
                {...form.register("amountPaid")}
              />
              <div className="flex flex-wrap gap-2">
                {[payable, Math.ceil(payable / 100) * 100, payable + 500].map(
                  (amt, i) => (
                    <Button
                      key={i}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => form.setValue("amountPaid", round2(amt))}
                    >
                      {formatCurrency(amt)}
                    </Button>
                  )
                )}
              </div>
              <p
                className={cn(
                  "text-sm font-medium",
                  change > 0 ? "text-pharmacy-700" : "text-muted-foreground"
                )}
              >
                Change: {formatCurrency(change)}
              </p>
            </div>
          ) : null}

          {paymentMethod === "INSURANCE" ? (
            <div className="space-y-2">
              <Label htmlFor="policy">Insurance policy #</Label>
              <Input
                id="policy"
                placeholder="Policy / claim number"
                {...form.register("insurancePolicyNumber")}
              />
              {form.formState.errors.insurancePolicyNumber ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.insurancePolicyNumber.message}
                </p>
              ) : null}
            </div>
          ) : null}

          {customer ? (
            <div className="space-y-2 rounded-lg border border-pharmacy-100 bg-pharmacy-50/60 p-3">
              <div className="flex items-center justify-between text-sm">
                <span>Loyalty points</span>
                <span className="font-medium">
                  {customer.loyaltyPoints} available
                </span>
              </div>
              <Label htmlFor="loyalty">Redeem points</Label>
              <Input
                id="loyalty"
                type="number"
                min={0}
                max={maxRedeemable}
                step={1}
                {...form.register("loyaltyRedeemed")}
              />
              <p className="text-xs text-muted-foreground">
                {REDEMPTION_RATE} pts = {formatCurrency(1)}. Max redeemable:{" "}
                {maxRedeemable} pts ({formatCurrency(maxRedeemable / REDEMPTION_RATE)})
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Select a customer to redeem loyalty points.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" placeholder="Optional" {...form.register("notes")} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={checkout.isPending}
            >
              {checkout.isPending ? "Processing…" : "Complete sale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
