"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  RotateCcw,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { ReceiptPrinter, saleToReceipt } from "@/components/pos/ReceiptPrinter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSale } from "@/lib/hooks/useSales";
import { downloadReceiptPdf } from "@/lib/utils/pdf";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data: sale, isLoading, error } = useSale(id);
  const [receiptOpen, setReceiptOpen] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  const handlePdf = async () => {
    if (!sale) return;
    try {
      setDownloading(true);
      await downloadReceiptPdf(saleToReceipt(sale));
      toast.success("Receipt PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF failed");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !sale) {
    return (
      <EmptyState
        title="Sale not found"
        description={error?.message ?? "This sale may have been removed."}
      >
        <Button asChild variant="outline" className="mt-6">
          <Link href="/sales">Back to sales</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={sale.saleNumber}
        description={`Sold ${formatDateTime(sale.createdAt)}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Sales", href: "/sales" },
          { label: sale.saleNumber },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link href="/sales">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setReceiptOpen(true)}
            >
              <Printer className="h-4 w-4" />
              Reprint
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={downloading}
              onClick={() => void handlePdf()}
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            {sale.status === "COMPLETED" ? (
              <Button
                asChild
                size="sm"
                variant="primary"
                className="gap-1"
              >
                <Link href={`/returns?saleId=${sale.id}`}>
                  <RotateCcw className="h-4 w-4" />
                  Initiate return
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge
              variant={
                sale.status === "COMPLETED"
                  ? "success"
                  : sale.status === "PENDING"
                    ? "warning"
                    : "secondary"
              }
            >
              {sale.status}
            </Badge>
            {sale.isHeld ? <Badge variant="outline">Held</Badge> : null}
            <Badge variant="outline">
              {sale.paymentMethod.replace("_", " ")}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{sale.customer?.name ?? "Walk-in"}</p>
            {sale.customer?.phone ? (
              <p className="text-sm text-muted-foreground">
                {sale.customer.phone}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Cashier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{sale.cashier?.name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">
              Total {formatCurrency(sale.total)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-pharmacy-900">
            Line items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sale.items ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.medicine?.name ?? item.medicineId}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.batch?.batchNumber ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.discount)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>-{formatCurrency(sale.discount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(sale.tax)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-pharmacy-800">
              <span>Total</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span>{formatCurrency(sale.amountPaid)}</span>
            </div>
            {sale.change > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Change</span>
                <span>{formatCurrency(sale.change)}</span>
              </div>
            ) : null}
            {sale.loyaltyEarned > 0 || sale.loyaltyRedeemed > 0 ? (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Loyalty</span>
                <span>
                  +{sale.loyaltyEarned} / −{sale.loyaltyRedeemed} pts
                </span>
              </div>
            ) : null}
          </div>

          {sale.notes ? (
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              {sale.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <ReceiptPrinter
        sale={sale}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </div>
  );
}
