"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { BatchListItem } from "@/types";

interface BatchTableProps {
  data: BatchListItem[];
  isLoading?: boolean;
  searchValue?: string;
  onEmptyAction?: () => void;
  showMedicine?: boolean;
}

const EXPIRY_STYLES: Record<BatchListItem["expiryStatus"], string> = {
  expired: "border-stroke bg-transparent text-foreground",
  critical: "border-stroke bg-transparent text-foreground",
  warning: "border-border bg-transparent text-muted-foreground",
  ok: "border-border bg-transparent text-muted-foreground",
};

export function BatchTable({
  data,
  isLoading,
  searchValue,
  onEmptyAction,
  showMedicine = true,
}: BatchTableProps) {
  const columns: ColumnDef<BatchListItem>[] = [
    ...(showMedicine
      ? [
          {
            id: "medicine",
            header: "Medicine",
            accessorFn: (row) => row.medicine?.name ?? "",
            cell: ({ row }) => (
              <div>
                <Link
                  href={`/medicines/${row.original.medicineId}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {row.original.medicine?.name ?? "—"}
                </Link>
                <p className="font-mono text-xs text-muted-foreground">
                  {row.original.medicine?.sku}
                </p>
              </div>
            ),
          } as ColumnDef<BatchListItem>,
        ]
      : []),
    {
      accessorKey: "batchNumber",
      header: "Batch #",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.batchNumber}</span>
      ),
    },
    {
      accessorKey: "remainingQuantity",
      header: "Remaining",
      cell: ({ row }) => (
        <span>
          {formatNumber(row.original.remainingQuantity)} /{" "}
          {formatNumber(row.original.quantity)}
        </span>
      ),
    },
    {
      accessorKey: "sellingPrice",
      header: "Price",
      cell: ({ row }) => formatCurrency(row.original.sellingPrice),
    },
    {
      accessorKey: "unitCost",
      header: "Cost",
      cell: ({ row }) => formatCurrency(row.original.unitCost),
    },
    {
      accessorKey: "expiryDate",
      header: "Expiry",
      cell: ({ row }) => (
        <div>
          <p>{formatDate(row.original.expiryDate)}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.daysUntilExpiry < 0
              ? `${Math.abs(row.original.daysUntilExpiry)}d overdue`
              : `${row.original.daysUntilExpiry}d left`}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "expiryStatus",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={cn(
            "border-0 capitalize",
            EXPIRY_STYLES[row.original.expiryStatus]
          )}
        >
          {row.original.expiryStatus}
        </Badge>
      ),
    },
    {
      id: "supplier",
      header: "Supplier",
      accessorFn: (row) => row.supplier?.name ?? "—",
    },
    {
      id: "location",
      header: "Location",
      accessorFn: (row) => row.location?.name ?? "—",
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      searchKey={showMedicine ? "medicine" : "batchNumber"}
      searchValue={searchValue}
      emptyTitle="No batches found"
      emptyDescription="Receive stock to create batches for medicines."
      emptyActionLabel="Add batch"
      onEmptyAction={onEmptyAction}
      filename="batches.csv"
      pageSize={20}
      showPagination={false}
    />
  );
}
