"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterPanel } from "@/components/shared/FilterPanel";
import { Button } from "@/components/ui/button";
import { MedicineTable } from "@/components/inventory/MedicineTable";
import { BarcodeScanner } from "@/components/inventory/BarcodeScanner";
import {
  useMedicines,
  type MedicinesQueryParams,
} from "@/lib/hooks/useMedicines";

const UNIT_OPTIONS = [
  "TABLET",
  "CAPSULE",
  "SYRUP",
  "INJECTION",
  "CREAM",
  "DROPS",
  "INHALER",
  "PATCH",
  "SUPPOSITORY",
  "OTHER",
].map((value) => ({ label: value, value }));

const CATEGORY_OPTIONS = [
  "Antibiotics",
  "Analgesics",
  "Antihypertensives",
  "Vitamins",
  "Antidiabetics",
  "Antihistamines",
  "Gastrointestinal",
  "Dermatology",
  "Other",
].map((value) => ({ label: value, value }));

export default function StoreInventoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({
    category: "",
    unit: "",
    lowStock: "",
  });

  const query: MedicinesQueryParams = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      category: filters.category || undefined,
      unit: filters.unit || undefined,
      lowStock: filters.lowStock === "true" ? true : undefined,
      hasStock: true,
      source: "local",
      sortBy: "name",
      sortOrder: "asc",
    }),
    [page, search, filters]
  );

  const { data, isLoading, isError, error } = useMedicines(query);

  return (
    <div className="space-y-2">
      <PageHeader
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/medicines")}
            >
              Medicine catalog
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/inventory/batches")}
            >
              <Layers className="mr-2 h-4 w-4" />
              Batches
            </Button>
            <Button type="button" onClick={() => router.push("/medicines/add")}>
              <Plus className="mr-2 h-4 w-4" />
              Add medicine
            </Button>
          </>
        }
      />

      <div className="rounded-lg border bg-card p-4">
        <BarcodeScanner
          onScan={async (code) => {
            const res = await fetch(
              `/api/barcode?code=${encodeURIComponent(code)}`,
              { credentials: "include" }
            );
            const body = await res.json();
            if (!res.ok || !body.success) {
              throw new Error(body?.error?.message ?? "Medicine not found");
            }
            toast.success(`Found ${body.data.name}`);
            router.push(`/medicines/${body.data.id}`);
          }}
        />
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search in-stock medicines..."
          className="w-full flex-1 sm:max-w-xs"
        />
        <FilterPanel
          values={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
          fields={[
            { id: "category", label: "Category", options: CATEGORY_OPTIONS },
            { id: "unit", label: "Unit", options: UNIT_OPTIONS },
            {
              id: "lowStock",
              label: "Stock",
              options: [{ label: "Low stock only", value: "true" }],
            },
          ]}
        />
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}

      <MedicineTable
        data={data?.data ?? []}
        isLoading={isLoading}
        searchValue={search}
        basePath="/medicines"
        showStockColumns
        showSource={false}
        emptyTitle="No store stock yet"
        emptyDescription="Receive a purchase order or add a batch to put medicines into inventory."
        emptyActionLabel="View batches"
        onEmptyAction={() => router.push("/inventory/batches")}
        filename="store-inventory.csv"
      />

      {data?.meta ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total}{" "}
            in-stock items
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
    </div>
  );
}
