"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import type { POStatus, PurchaseOrderItemDTO, StockLocationDTO } from "@/types";
import {
  usePurchase,
  useReceivePurchase,
  useUpdatePurchase,
} from "@/lib/hooks/usePurchases";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageSkeleton } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PO_VARIANT: Record<
  POStatus,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  DRAFT: "secondary",
  SENT: "outline",
  CONFIRMED: "default",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "destructive",
};

interface ReceiveLine {
  id: string;
  medicineName: string;
  remaining: number;
  receivedQuantity: number;
  batchNumber: string;
  expiryDate: string;
  sellingPrice: number;
  locationId: string;
  unitCost: number;
  selected: boolean;
}

function buildReceiveLines(items: PurchaseOrderItemDTO[]): ReceiveLine[] {
  return items
    .filter((item) => item.receivedQuantity < item.quantity)
    .map((item) => {
      const remaining = item.quantity - item.receivedQuantity;
      return {
        id: item.id,
        medicineName: item.medicine?.name ?? item.medicineId,
        remaining,
        receivedQuantity: remaining,
        batchNumber: item.batchNumber ?? "",
        expiryDate: item.expiryDate
          ? new Date(item.expiryDate).toISOString().slice(0, 10)
          : "",
        sellingPrice: Number((item.unitCost * 1.25).toFixed(2)),
        locationId: "",
        unitCost: item.unitCost,
        selected: true,
      };
    });
}

export default function PurchaseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { data, isLoading, error, refetch } = usePurchase(id);
  const updateMutation = useUpdatePurchase();
  const receiveMutation = useReceivePurchase();

  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [lines, setLines] = React.useState<ReceiveLine[]>([]);

  const purchaseOrder = data?.purchaseOrder;
  const locations: StockLocationDTO[] = data?.locations ?? [];

  React.useEffect(() => {
    if (purchaseOrder?.items && receiveOpen) {
      setLines(buildReceiveLines(purchaseOrder.items));
    }
  }, [purchaseOrder, receiveOpen]);

  const setStatus = async (status: POStatus) => {
    if (!purchaseOrder) return;
    try {
      await updateMutation.mutateAsync({
        id: purchaseOrder.id,
        data: { status },
      });
      toast.success(`Status updated to ${status}`);
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const updateLine = (itemId: string, patch: Partial<ReceiveLine>) => {
    setLines((prev) =>
      prev.map((line) => (line.id === itemId ? { ...line, ...patch } : line))
    );
  };

  const handleReceive = async () => {
    if (!purchaseOrder) return;
    const selected = lines.filter((line) => line.selected);
    if (selected.length === 0) {
      toast.error("Select at least one item to receive");
      return;
    }

    const invalid = selected.find(
      (line) =>
        !line.batchNumber.trim() ||
        !line.expiryDate ||
        line.receivedQuantity < 1 ||
        line.receivedQuantity > line.remaining ||
        line.sellingPrice < 0
    );
    if (invalid) {
      toast.error(
        "Each selected item needs batch #, expiry, and a valid quantity"
      );
      return;
    }

    try {
      await receiveMutation.mutateAsync({
        id: purchaseOrder.id,
        items: selected.map((line) => ({
          id: line.id,
          receivedQuantity: line.receivedQuantity,
          batchNumber: line.batchNumber.trim(),
          expiryDate: new Date(line.expiryDate),
          sellingPrice: line.sellingPrice,
          locationId: line.locationId || null,
        })),
      });
      toast.success("Goods received and stock updated");
      setReceiveOpen(false);
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to receive goods");
    }
  };

  if (isLoading) return <PageSkeleton />;

  if (error || !purchaseOrder) {
    return (
      <div className="space-y-4">
        <PageHeader title="Purchase order not found" />
        <Button asChild variant="outline">
          <Link href="/purchases">Back to purchases</Link>
        </Button>
      </div>
    );
  }

  const canReceive =
    purchaseOrder.status !== "CANCELLED" &&
    purchaseOrder.status !== "RECEIVED" &&
    (purchaseOrder.items ?? []).some(
      (item) => item.receivedQuantity < item.quantity
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title={purchaseOrder.poNumber}
        description={
          purchaseOrder.supplier
            ? `Supplier: ${purchaseOrder.supplier.name}`
            : "Purchase order details"
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Purchases", href: "/purchases" },
          { label: purchaseOrder.poNumber },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/purchases">Back</Link>
            </Button>
            {purchaseOrder.status === "DRAFT" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void setStatus("SENT")}
                disabled={updateMutation.isPending}
              >
                Mark sent
              </Button>
            ) : null}
            {purchaseOrder.status === "SENT" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void setStatus("CONFIRMED")}
                disabled={updateMutation.isPending}
              >
                Confirm
              </Button>
            ) : null}
            {canReceive ? (
              <Button type="button" onClick={() => setReceiveOpen(true)}>
                Receive goods
              </Button>
            ) : null}
            {purchaseOrder.status !== "RECEIVED" &&
            purchaseOrder.status !== "CANCELLED" ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void setStatus("CANCELLED")}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Summary</CardTitle>
            <Badge variant={PO_VARIANT[purchaseOrder.status]}>
              {purchaseOrder.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Supplier</p>
              <p className="font-medium">
                {purchaseOrder.supplier ? (
                  <Link
                    href={`/suppliers/${purchaseOrder.supplier.id}`}
                    className="hover:underline"
                  >
                    {purchaseOrder.supplier.name}
                  </Link>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Expected date</p>
              <p className="font-medium">
                {formatDate(purchaseOrder.expectedDate)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total amount</p>
              <p className="font-medium">
                {formatCurrency(purchaseOrder.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">
                {formatDate(purchaseOrder.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Notes</p>
              <p className="font-medium">{purchaseOrder.notes || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Unit cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(purchaseOrder.items ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.medicine?.name ?? item.medicineId}
                      {item.batchNumber ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Batch {item.batchNumber}
                          {item.expiryDate
                            ? ` · exp ${formatDate(item.expiryDate)}`
                            : ""}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {item.receivedQuantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unitCost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.totalCost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive goods</DialogTitle>
            <DialogDescription>
              Create batches, update received quantities, and post stock
              adjustments for {purchaseOrder.poNumber}.
            </DialogDescription>
          </DialogHeader>

          {lines.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              All items on this purchase order have been fully received.
            </p>
          ) : (
            <div className="space-y-4">
              {lines.map((line) => (
                <div key={line.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{line.medicineName}</p>
                      <p className="text-xs text-muted-foreground">
                        Remaining to receive: {line.remaining} · cost{" "}
                        {formatCurrency(line.unitCost)}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={line.selected}
                        onChange={(e) =>
                          updateLine(line.id, { selected: e.target.checked })
                        }
                      />
                      Receive
                    </label>
                  </div>

                  {line.selected ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min={1}
                          max={line.remaining}
                          value={line.receivedQuantity}
                          onChange={(e) =>
                            updateLine(line.id, {
                              receivedQuantity: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Batch number</Label>
                        <Input
                          value={line.batchNumber}
                          onChange={(e) =>
                            updateLine(line.id, {
                              batchNumber: e.target.value,
                            })
                          }
                          placeholder="BATCH-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expiry date</Label>
                        <Input
                          type="date"
                          value={line.expiryDate}
                          onChange={(e) =>
                            updateLine(line.id, {
                              expiryDate: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Selling price</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.sellingPrice}
                          onChange={(e) =>
                            updateLine(line.id, {
                              sellingPrice: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Location</Label>
                        <Select
                          value={line.locationId || "none"}
                          onValueChange={(value) =>
                            updateLine(line.id, {
                              locationId: value === "none" ? "" : value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Optional location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No location</SelectItem>
                            {locations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name} ({location.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReceiveOpen(false)}
              disabled={receiveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleReceive()}
              disabled={receiveMutation.isPending || lines.length === 0}
            >
              {receiveMutation.isPending ? "Receiving..." : "Confirm receive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
