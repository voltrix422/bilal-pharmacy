"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ReturnDTO, SaleDTO, SaleItemDTO } from "@/types";
import { useCreateReturn, useReturns } from "@/lib/hooks/useReturns";
import { useSales } from "@/lib/hooks/useSales";
import { useMedicines } from "@/lib/hooks/useMedicines";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchBar } from "@/components/shared/SearchBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ReturnTypeFilter = "ALL" | "CUSTOMER_RETURN" | "SUPPLIER_RETURN";

type FormLine = {
  key: string;
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  maxQty: number;
  quantity: number;
  unitPrice: number;
  condition: "RESTOCK" | "DAMAGED";
  selected: boolean;
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  PENDING: "warning",
  APPROVED: "default",
  COMPLETED: "success",
  REJECTED: "destructive",
};

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ReturnsPage() {
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<ReturnTypeFilter>("ALL");
  const [page, setPage] = React.useState(1);
  const [open, setOpen] = React.useState(false);
  const [returnType, setReturnType] = React.useState<
    "CUSTOMER_RETURN" | "SUPPLIER_RETURN"
  >("CUSTOMER_RETURN");
  const [saleId, setSaleId] = React.useState("");
  const [saleSearch, setSaleSearch] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [lines, setLines] = React.useState<FormLine[]>([]);

  const { data, isLoading } = useReturns({
    page,
    limit: 50,
    search: search || undefined,
    type: typeFilter === "ALL" ? undefined : typeFilter,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const { data: salesData } = useSales(
    {
      search: saleSearch || undefined,
      status: "COMPLETED",
      limit: 20,
      page: 1,
    },
    { enabled: open && returnType === "CUSTOMER_RETURN" }
  );

  const { data: medicinesData } = useMedicines(
    { search: "", limit: 50, isActive: true },
    { enabled: open && returnType === "SUPPLIER_RETURN" }
  );

  const createReturn = useCreateReturn();
  const returns = data?.returns ?? [];
  const sales = salesData?.sales ?? [];
  const medicines = medicinesData?.data ?? [];
  const selectedSale = sales.find((s) => s.id === saleId) as SaleDTO | undefined;

  React.useEffect(() => {
    if (!selectedSale?.items) {
      if (returnType === "CUSTOMER_RETURN") setLines([]);
      return;
    }
    setLines(
      selectedSale.items.map((item: SaleItemDTO) => ({
        key: item.id,
        medicineId: item.medicineId,
        medicineName: item.medicine?.name ?? "Medicine",
        batchId: item.batchId,
        batchNumber: item.batch?.batchNumber ?? "—",
        maxQty: item.quantity,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        condition: "RESTOCK" as const,
        selected: true,
      }))
    );
  }, [selectedSale, returnType]);

  function resetForm() {
    setReturnType("CUSTOMER_RETURN");
    setSaleId("");
    setSaleSearch("");
    setReason("");
    setLines([]);
  }

  function addSupplierLine() {
    const medicine = medicines[0];
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        medicineId: medicine?.id ?? "",
        medicineName: medicine?.name ?? "",
        batchId: "",
        batchNumber: "",
        maxQty: 9999,
        quantity: 1,
        unitPrice: 0,
        condition: "RESTOCK",
        selected: true,
      },
    ]);
  }

  async function handleSubmit() {
    const selected = lines.filter((l) => l.selected && l.medicineId && l.batchId);
    if (selected.length === 0) {
      toast.error("Select at least one item");
      return;
    }
    if (returnType === "CUSTOMER_RETURN" && !saleId) {
      toast.error("Select a sale");
      return;
    }

    try {
      await createReturn.mutateAsync({
        type: returnType,
        saleId: returnType === "CUSTOMER_RETURN" ? saleId : null,
        customerId: selectedSale?.customerId ?? null,
        reason: reason || null,
        status: "COMPLETED",
        items: selected.map((line) => ({
          medicineId: line.medicineId,
          batchId: line.batchId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          refundAmount:
            returnType === "CUSTOMER_RETURN"
              ? Math.round(line.quantity * line.unitPrice * 100) / 100
              : 0,
          condition: line.condition,
          reason: null,
        })),
      });
      toast.success("Return processed successfully");
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create return"
      );
    }
  }

  const columns = React.useMemo<ColumnDef<ReturnDTO>[]>(
    () => [
      {
        accessorKey: "returnNumber",
        header: "Return #",
        cell: ({ row }) => (
          <span className="font-medium text-pharmacy-700">
            {row.original.returnNumber}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.original.type === "CUSTOMER_RETURN"
              ? "Customer"
              : "Supplier"}
          </Badge>
        ),
      },
      {
        id: "reference",
        header: "Reference",
        cell: ({ row }) => {
          const r = row.original as ReturnDTO & {
            sale?: { saleNumber?: string } | null;
            customer?: { name?: string } | null;
          };
          if (r.sale?.saleNumber) return r.sale.saleNumber;
          if (r.customer?.name) return r.customer.name;
          return "—";
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status] ?? "outline"}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "totalRefund",
        header: "Refund",
        cell: ({ row }) => formatCurrency(row.original.totalRefund),
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: "items",
        header: "Items",
        cell: ({ row }) =>
          row.original.items?.length ??
          (row.original as { _count?: { items?: number } })._count?.items ??
          0,
      },
    ],
    []
  );

  const refundTotal = lines
    .filter((l) => l.selected)
    .reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Returns"
        description="Process customer refunds and supplier stock returns."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Returns" },
        ]}
        actions={
          <Button
            variant="primary"
            className="gap-1.5"
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New return
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search return #, sale, customer…"
          className="max-w-md flex-1"
        />
        <Tabs
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v as ReturnTypeFilter);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="CUSTOMER_RETURN">Customer</TabsTrigger>
            <TabsTrigger value="SUPPLIER_RETURN">Supplier</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!isLoading && returns.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="No returns yet"
          description="Create a customer or supplier return to get started."
          actionLabel="New return"
          onAction={() => setOpen(true)}
        />
      ) : (
        <DataTable
          columns={columns}
          data={returns}
          isLoading={isLoading}
          pageSize={50}
          filename="returns.csv"
          emptyTitle="No returns"
          emptyActionLabel="New return"
          onEmptyAction={() => setOpen(true)}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create return</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Return type</Label>
              <Select
                value={returnType}
                onValueChange={(v) => {
                  setReturnType(v as typeof returnType);
                  setSaleId("");
                  setLines([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER_RETURN">
                    Customer return
                  </SelectItem>
                  <SelectItem value="SUPPLIER_RETURN">
                    Supplier return
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {returnType === "CUSTOMER_RETURN" ? (
              <div className="space-y-2">
                <Label>Sale</Label>
                <Input
                  placeholder="Search sale number…"
                  value={saleSearch}
                  onChange={(e) => setSaleSearch(e.target.value)}
                />
                <Select value={saleId} onValueChange={setSaleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select completed sale" />
                  </SelectTrigger>
                  <SelectContent>
                    {sales.map((sale) => (
                      <SelectItem key={sale.id} value={sale.id}>
                        {sale.saleNumber} · {formatCurrency(sale.total)} ·{" "}
                        {sale.customer?.name ?? "Walk-in"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <Label>Items to return to supplier</Label>
                <Button type="button" size="sm" variant="outline" onClick={addSupplierLine}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add line
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {returnType === "CUSTOMER_RETURN"
                    ? "Select a sale to load returnable items."
                    : "Add medicines and batches to return."}
                </p>
              ) : (
                lines.map((line, index) => (
                  <div
                    key={line.key}
                    className="grid gap-3 rounded-lg border p-3 sm:grid-cols-12"
                  >
                    {returnType === "CUSTOMER_RETURN" ? (
                      <div className="flex items-start gap-2 sm:col-span-4">
                        <Checkbox
                          checked={line.selected}
                          onCheckedChange={(checked) =>
                            setLines((prev) =>
                              prev.map((l, i) =>
                                i === index
                                  ? { ...l, selected: Boolean(checked) }
                                  : l
                              )
                            )
                          }
                        />
                        <div>
                          <p className="text-sm font-medium">{line.medicineName}</p>
                          <p className="text-xs text-muted-foreground">
                            Batch {line.batchNumber}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 sm:col-span-4">
                        <Select
                          value={line.medicineId || undefined}
                          onValueChange={(medicineId) => {
                            const med = medicines.find(
                              (m) => m.id === medicineId
                            );
                            setLines((prev) =>
                              prev.map((l, i) =>
                                i === index
                                  ? {
                                      ...l,
                                      medicineId,
                                      medicineName: med?.name ?? "",
                                      batchId: "",
                                      batchNumber: "",
                                      unitPrice: 0,
                                    }
                                  : l
                              )
                            );
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Medicine" />
                          </SelectTrigger>
                          <SelectContent>
                            {medicines.map((med) => (
                              <SelectItem key={med.id} value={med.id}>
                                {med.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <SupplierBatchSelect
                          medicineId={line.medicineId}
                          value={line.batchId}
                          onChange={(batch) =>
                            setLines((prev) =>
                              prev.map((l, i) =>
                                i === index
                                  ? {
                                      ...l,
                                      batchId: batch.id,
                                      batchNumber: batch.batchNumber,
                                      maxQty: batch.remainingQuantity,
                                      unitPrice: batch.unitCost,
                                      quantity: Math.min(
                                        l.quantity,
                                        batch.remainingQuantity
                                      ),
                                    }
                                  : l
                              )
                            )
                          }
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        max={line.maxQty}
                        value={line.quantity}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) =>
                              i === index
                                ? {
                                    ...l,
                                    quantity: Math.min(
                                      Math.max(1, Number(e.target.value) || 1),
                                      l.maxQty
                                    ),
                                  }
                                : l
                            )
                          )
                        }
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <Label className="text-xs">Condition</Label>
                      <Select
                        value={line.condition}
                        onValueChange={(v) =>
                          setLines((prev) =>
                            prev.map((l, i) =>
                              i === index
                                ? {
                                    ...l,
                                    condition: v as "RESTOCK" | "DAMAGED",
                                  }
                                : l
                            )
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RESTOCK">
                            {returnType === "CUSTOMER_RETURN"
                              ? "Restock"
                              : "Return to supplier"}
                          </SelectItem>
                          <SelectItem value="DAMAGED">Damaged</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end justify-between gap-2 sm:col-span-3">
                      <div>
                        <Label className="text-xs">
                          {returnType === "CUSTOMER_RETURN" ? "Refund" : "Cost"}
                        </Label>
                        <p className="text-sm font-medium">
                          {formatCurrency(line.quantity * line.unitPrice)}
                        </p>
                      </div>
                      {returnType === "SUPPLIER_RETURN" ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setLines((prev) => prev.filter((_, i) => i !== index))
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional notes / reason"
                rows={2}
              />
            </div>

            {returnType === "CUSTOMER_RETURN" ? (
              <div className="rounded-lg bg-pharmacy-50 px-3 py-2 text-sm dark:bg-pharmacy-950/30">
                Estimated refund:{" "}
                <span className="font-semibold">
                  {formatCurrency(refundTotal)}
                </span>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={createReturn.isPending}
              onClick={handleSubmit}
            >
              {createReturn.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Process return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SupplierBatchSelect({
  medicineId,
  value,
  onChange,
}: {
  medicineId: string;
  value: string;
  onChange: (batch: {
    id: string;
    batchNumber: string;
    remainingQuantity: number;
    unitCost: number;
  }) => void;
}) {
  const [batches, setBatches] = React.useState<
    Array<{
      id: string;
      batchNumber: string;
      remainingQuantity: number;
      unitCost: number;
    }>
  >([]);

  React.useEffect(() => {
    if (!medicineId) {
      setBatches([]);
      return;
    }
    let active = true;
    void fetch(
      `/api/batches?medicineId=${medicineId}&isActive=true&limit=50`,
      { credentials: "include" }
    )
      .then((res) => res.json())
      .then((body) => {
        if (!active) return;
        setBatches(body?.data ?? []);
      })
      .catch(() => {
        if (active) setBatches([]);
      });
    return () => {
      active = false;
    };
  }, [medicineId]);

  return (
    <Select
      value={value || undefined}
      onValueChange={(batchId) => {
        const batch = batches.find((b) => b.id === batchId);
        if (batch) onChange(batch);
      }}
      disabled={!medicineId}
    >
      <SelectTrigger>
        <SelectValue placeholder="Batch" />
      </SelectTrigger>
      <SelectContent>
        {batches.map((batch) => (
          <SelectItem key={batch.id} value={batch.id}>
            {batch.batchNumber} ({batch.remainingQuantity} left)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
