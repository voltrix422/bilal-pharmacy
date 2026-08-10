"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { MedicineForm } from "@/components/inventory/MedicineForm";
import { BatchForm } from "@/components/inventory/BatchForm";
import { BatchTable } from "@/components/inventory/BatchTable";
import { StockBadge } from "@/components/inventory/StockBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreateBatch,
  useDeleteMedicine,
  useMedicine,
  useUpdateMedicine,
} from "@/lib/hooks/useMedicines";
import { formatDateTime } from "@/lib/utils/format";
import type { MedicineInput } from "@/lib/validations/medicine";
import type { BatchListItem } from "@/types";
import type { LocationType, MedicineUnit } from "@prisma/client";

type MedicineDetail = {
  id: string;
  name: string;
  genericName?: string | null;
  brand?: string | null;
  category: string;
  description?: string | null;
  sku: string;
  barcode?: string | null;
  unit: MedicineUnit;
  strength?: string | null;
  manufacturer?: string | null;
  country?: string | null;
  requiresPrescription: boolean;
  isControlled: boolean;
  isActive: boolean;
  imageUrl?: string | null;
  minStockLevel: number;
  reorderPoint: number;
  totalStock: number;
  stockLevel: "out" | "critical" | "low" | "ok" | "overstocked";
  createdAt: string;
  updatedAt: string;
  batches: Array<{
    id: string;
    medicineId: string;
    supplierId?: string | null;
    batchNumber: string;
    quantity: number;
    remainingQuantity: number;
    unitCost: number;
    sellingPrice: number;
    expiryDate: string;
    receivedDate: string;
    locationId?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    supplier?: { id: string; name: string } | null;
    location?: { id: string; name: string; type: LocationType } | null;
    expiryStatus: BatchListItem["expiryStatus"];
  }>;
  history: Array<{
    id: string;
    batchId: string;
    batchNumber: string;
    type: string;
    quantityChange: number;
    previousQuantity: number;
    newQuantity: number;
    reason?: string | null;
    performedByName: string;
    createdAt: string;
  }>;
};

export default function MedicineDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id;

  const { data, isLoading, isError, error, refetch } = useMedicine(id);
  const updateMutation = useUpdateMedicine();
  const deleteMutation = useDeleteMedicine();
  const createBatch = useCreateBatch();

  const medicine = data as MedicineDetail | undefined;
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [batchOpen, setBatchOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const batchRows: BatchListItem[] = useMemo(() => {
    if (!medicine?.batches) return [];
    return medicine.batches.map((batch) => {
      const daysUntilExpiry = Math.ceil(
        (new Date(batch.expiryDate).setHours(0, 0, 0, 0) -
          new Date().setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24)
      );
      return {
        ...batch,
        medicine: {
          id: medicine.id,
          name: medicine.name,
          sku: medicine.sku,
          unit: medicine.unit,
          category: medicine.category,
        },
        daysUntilExpiry,
      };
    });
  }, [medicine]);

  if (isLoading) {
    return <LoadingSpinner fullPage label="Loading medicine..." />;
  }

  if (isError || !medicine) {
    return (
      <EmptyState
        title="Medicine not found"
        description={error?.message || "This medicine does not exist."}
        actionLabel="Back to inventory"
        onAction={() => router.push("/medicines")}
      />
    );
  }

  const formDefaults: Partial<MedicineInput> = {
    name: medicine.name,
    genericName: medicine.genericName ?? "",
    brand: medicine.brand ?? "",
    category: medicine.category,
    description: medicine.description ?? "",
    sku: medicine.sku,
    barcode: medicine.barcode ?? "",
    unit: medicine.unit,
    strength: medicine.strength ?? "",
    manufacturer: medicine.manufacturer ?? "",
    country: medicine.country ?? "",
    requiresPrescription: medicine.requiresPrescription,
    isControlled: medicine.isControlled,
    isActive: medicine.isActive,
    imageUrl: medicine.imageUrl ?? "",
    minStockLevel: medicine.minStockLevel,
    reorderPoint: medicine.reorderPoint,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={medicine.name}
        description={
          medicine.genericName
            ? `${medicine.genericName}${medicine.strength ? ` · ${medicine.strength}` : ""}`
            : medicine.strength || "Medicine details, batches, and stock history"
        }
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Medicines", href: "/medicines" },
          { label: medicine.name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/medicines">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing((v) => !v)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {editing ? "Cancel edit" : "Edit"}
            </Button>
            <Button type="button" onClick={() => setBatchOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add batch
            </Button>
            {medicine.isActive ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Deactivate
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-muted-foreground">Stock</p>
            <StockBadge
              quantity={medicine.totalStock}
              minStockLevel={medicine.minStockLevel}
              reorderPoint={medicine.reorderPoint}
              level={medicine.stockLevel}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="text-sm text-muted-foreground">SKU</p>
            <p className="font-mono text-sm">{medicine.sku}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="text-sm text-muted-foreground">Barcode</p>
            <p className="font-mono text-sm">{medicine.barcode || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-muted-foreground">Flags</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline">{medicine.category}</Badge>
              <Badge variant="outline">{medicine.unit}</Badge>
              {medicine.requiresPrescription ? (
                <Badge className="border-0 bg-sky-100 text-sky-800">Rx</Badge>
              ) : null}
              {medicine.isControlled ? (
                <Badge className="border-0 bg-red-100 text-red-800">CTRL</Badge>
              ) : null}
              {!medicine.isActive ? (
                <Badge variant="secondary">Inactive</Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {editing ? (
        <Card className="border-pharmacy-100/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">Edit medicine</CardTitle>
          </CardHeader>
          <CardContent>
            <MedicineForm
              defaultValues={formDefaults}
              isSubmitting={updateMutation.isPending}
              submitLabel="Update medicine"
              onSubmit={async (values) => {
                try {
                  await updateMutation.mutateAsync({ id, data: values });
                  toast.success("Medicine updated");
                  setEditing(false);
                  await refetch();
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Update failed"
                  );
                }
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Brand" value={medicine.brand} />
            <DetailItem label="Manufacturer" value={medicine.manufacturer} />
            <DetailItem label="Country" value={medicine.country} />
            <DetailItem label="Strength" value={medicine.strength} />
            <DetailItem
              label="Min stock"
              value={String(medicine.minStockLevel)}
            />
            <DetailItem
              label="Reorder point"
              value={String(medicine.reorderPoint)}
            />
            <DetailItem
              label="Created"
              value={formatDateTime(medicine.createdAt)}
            />
            <DetailItem
              label="Updated"
              value={formatDateTime(medicine.updatedAt)}
            />
            <div className="sm:col-span-2 lg:col-span-3">
              <DetailItem
                label="Description"
                value={medicine.description || "—"}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="batches">
        <TabsList>
          <TabsTrigger value="batches" className="gap-2">
            <Layers className="h-4 w-4" />
            Batches ({medicine.batches.length})
          </TabsTrigger>
          <TabsTrigger value="history">Stock history</TabsTrigger>
        </TabsList>

        <TabsContent value="batches" className="mt-4 space-y-4">
          <BatchTable
            data={batchRows}
            showMedicine={false}
            onEmptyAction={() => setBatchOpen(true)}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {medicine.history.length === 0 ? (
                <EmptyState
                  title="No stock movements"
                  description="Adjustments will appear when batches are received, sold, or corrected."
                  className="border-0"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicine.history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.batchNumber}
                        </TableCell>
                        <TableCell
                          className={
                            item.quantityChange < 0
                              ? "text-red-600"
                              : "text-emerald-700"
                          }
                        >
                          {item.quantityChange > 0 ? "+" : ""}
                          {item.quantityChange}
                        </TableCell>
                        <TableCell>
                          {item.previousQuantity} → {item.newQuantity}
                        </TableCell>
                        <TableCell>{item.performedByName}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {item.reason || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Add batch for {medicine.name}
            </DialogTitle>
          </DialogHeader>
          <BatchForm
            lockMedicineId={medicine.id}
            medicines={[
              { id: medicine.id, name: medicine.name, sku: medicine.sku },
            ]}
            isSubmitting={createBatch.isPending}
            onSubmit={async (values) => {
              try {
                await createBatch.mutateAsync(values);
                toast.success("Batch added");
                setBatchOpen(false);
                await refetch();
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Failed to add batch"
                );
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Deactivate medicine?"
        description={`${medicine.name} will be soft-deleted (isActive=false).`}
        confirmLabel="Deactivate"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync(medicine.id);
            toast.success("Medicine deactivated");
            router.push("/medicines");
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Failed to deactivate"
            );
          }
        }}
      />
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}
