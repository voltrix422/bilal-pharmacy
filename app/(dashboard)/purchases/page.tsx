"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { MedicineDTO, POStatus, PurchaseOrderDTO } from "@/types";
import {
  purchaseOrderSchema,
  type PurchaseOrderInput,
} from "@/lib/validations/purchase";
import { useCreatePurchase, usePurchases } from "@/lib/hooks/usePurchases";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchBar } from "@/components/shared/SearchBar";
import { PageSkeleton } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

async function searchMedicines(search: string): Promise<MedicineDTO[]> {
  const query = new URLSearchParams({
    search,
    limit: "20",
    isActive: "true",
  });
  const res = await fetch(`/api/medicines?${query.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  const body = await res.json();
  return (body?.data as MedicineDTO[]) ?? [];
}

function PurchasesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultSupplierId = searchParams.get("supplierId") ?? undefined;

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<POStatus | "ALL">("ALL");
  const [createOpen, setCreateOpen] = React.useState(Boolean(defaultSupplierId));
  const [medicineSearch, setMedicineSearch] = React.useState("");
  const [medicines, setMedicines] = React.useState<MedicineDTO[]>([]);

  const { data, isLoading } = usePurchases({
    search,
    status: status === "ALL" ? undefined : status,
    supplierId: defaultSupplierId,
    limit: 100,
  });
  const { data: suppliersData } = useSuppliers({ limit: 100, isActive: true });
  const createMutation = useCreatePurchase();

  const form = useForm<PurchaseOrderInput>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplierId: defaultSupplierId ?? "",
      expectedDate: undefined,
      notes: "",
      status: "DRAFT",
      items: [
        {
          medicineId: "",
          quantity: 1,
          unitCost: 0,
          batchNumber: "",
          expiryDate: undefined,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  React.useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void searchMedicines(medicineSearch).then((results) => {
        if (active) setMedicines(results);
      });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [medicineSearch]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const created = await createMutation.mutateAsync({
        ...values,
        notes: values.notes || null,
        expectedDate: values.expectedDate ?? null,
        items: values.items.map((item) => ({
          ...item,
          batchNumber: item.batchNumber || null,
          expiryDate: item.expiryDate ?? null,
        })),
      });
      toast.success("Purchase order created");
      setCreateOpen(false);
      router.push(`/purchases/${created.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create purchase order"
      );
    }
  });

  const columns = React.useMemo<ColumnDef<PurchaseOrderDTO>[]>(
    () => [
      {
        accessorKey: "poNumber",
        header: "PO #",
        cell: ({ row }) => (
          <Link
            href={`/purchases/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.poNumber}
          </Link>
        ),
      },
      {
        id: "supplier",
        header: "Supplier",
        accessorFn: (row) => row.supplier?.name ?? "",
        cell: ({ row }) => row.original.supplier?.name ?? "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={PO_VARIANT[row.original.status]}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "expectedDate",
        header: "Expected",
        cell: ({ row }) => formatDate(row.original.expectedDate),
      },
      {
        accessorKey: "totalAmount",
        header: "Total",
        cell: ({ row }) => formatCurrency(row.original.totalAmount),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href={`/purchases/${row.original.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Create orders and receive stock into inventory."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Purchases" },
        ]}
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New purchase order
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.purchases ?? []}
        isLoading={isLoading}
        filename="purchase-orders.csv"
        emptyTitle="No purchase orders"
        emptyDescription="Create a purchase order to replenish stock."
        emptyActionLabel="New purchase order"
        onEmptyAction={() => setCreateOpen(true)}
        toolbar={
          <>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search PO # or supplier..."
            />
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as POStatus | "ALL")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PARTIALLY_RECEIVED">
                  Partially received
                </SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New purchase order</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Supplier</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(suppliersData?.suppliers ?? []).map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expectedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={
                            field.value
                              ? new Date(field.value).toISOString().slice(0, 10)
                              : ""
                          }
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? new Date(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="SENT">Sent</SelectItem>
                          <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Items</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        medicineId: "",
                        quantity: 1,
                        unitCost: 0,
                        batchNumber: "",
                        expiryDate: undefined,
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add item
                  </Button>
                </div>
                <Input
                  placeholder="Search medicines..."
                  value={medicineSearch}
                  onChange={(e) => setMedicineSearch(e.target.value)}
                />
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid gap-3 rounded-lg border p-4 md:grid-cols-5"
                  >
                    <FormField
                      control={form.control}
                      name={`items.${index}.medicineId`}
                      render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Medicine</FormLabel>
                          <Select
                            value={itemField.value}
                            onValueChange={itemField.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select medicine" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {medicines.map((medicine) => (
                                <SelectItem
                                  key={medicine.id}
                                  value={medicine.id}
                                >
                                  {medicine.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field: itemField }) => (
                        <FormItem>
                          <FormLabel>Qty</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              value={itemField.value}
                              onChange={(e) =>
                                itemField.onChange(Number(e.target.value) || 1)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitCost`}
                      render={({ field: itemField }) => (
                        <FormItem>
                          <FormLabel>Unit cost</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={itemField.value}
                              onChange={(e) =>
                                itemField.onChange(Number(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create PO"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PurchasesPage() {
  return (
    <React.Suspense fallback={<PageSkeleton />}>
      <PurchasesPageContent />
    </React.Suspense>
  );
}
