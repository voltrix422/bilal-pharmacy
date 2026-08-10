"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterPanel } from "@/components/shared/FilterPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BatchTable } from "@/components/inventory/BatchTable";
import { BatchForm } from "@/components/inventory/BatchForm";
import {
  useBatches,
  useCreateBatch,
  useMedicines,
  type BatchesQueryParams,
} from "@/lib/hooks/useMedicines";

export default function BatchesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({
    expiryStatus: "",
    isActive: "true",
  });

  const query: BatchesQueryParams = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      expiryStatus: filters.expiryStatus || undefined,
      isActive:
        filters.isActive === ""
          ? undefined
          : filters.isActive === "true",
      sortBy: "expiryDate",
      sortOrder: "asc",
    }),
    [page, search, filters]
  );

  const { data, isLoading, isError, error } = useBatches(query);
  const medicinesQuery = useMedicines({ limit: 100, sortBy: "name", sortOrder: "asc" });
  const createBatch = useCreateBatch();

  const medicineOptions =
    medicinesQuery.data?.data.map((medicine) => ({
      id: medicine.id,
      name: medicine.name,
      sku: medicine.sku,
    })) ?? [];

  return (
    <div className="space-y-2">
      <PageHeader
        title="Batch Management"
        description="Track batch numbers, expiry dates, and remaining quantities."
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Inventory", href: "/inventory" },
          { label: "Batches" },
        ]}
        actions={
          <Button type="button" onClick={() => setOpen(true)}>
            Add batch
          </Button>
        }
      />

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search batch # or medicine..."
          className="w-full flex-1 sm:max-w-xs"
        />
        <FilterPanel
          values={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
          fields={[
            {
              id: "expiryStatus",
              label: "Expiry status",
              options: [
                { label: "Expired", value: "expired" },
                { label: "Critical (<7d)", value: "critical" },
                { label: "Warning (<30d)", value: "warning" },
                { label: "OK", value: "ok" },
              ],
            },
            {
              id: "isActive",
              label: "Active",
              options: [
                { label: "Active only", value: "true" },
                { label: "Inactive only", value: "false" },
              ],
            },
          ]}
        />
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}

      <BatchTable
        data={data?.data ?? []}
        isLoading={isLoading}
        searchValue={search}
        onEmptyAction={() => setOpen(true)}
      />

      {data?.meta ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total}{" "}
            batches
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= (data.meta.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add batch</DialogTitle>
          </DialogHeader>
          <BatchForm
            medicines={medicineOptions}
            isSubmitting={createBatch.isPending}
            submitLabel="Create batch"
            onSubmit={async (values) => {
              try {
                await createBatch.mutateAsync(values);
                toast.success("Batch created");
                setOpen(false);
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Failed to create batch"
                );
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
