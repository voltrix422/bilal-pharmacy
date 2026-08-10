"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { StockBadge } from "@/components/inventory/StockBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils/format";
import type { MedicineListItem } from "@/types";

interface MedicineTableProps {
  data: MedicineListItem[];
  isLoading?: boolean;
  onDeactivate?: (medicine: MedicineListItem) => void;
  onEmptyAction?: () => void;
  searchValue?: string;
  /** Detail/edit route prefix — use /medicines for catalog, /inventory for stock */
  basePath?: "/medicines" | "/inventory";
  showStockColumns?: boolean;
  showSource?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  filename?: string;
}

export function MedicineTable({
  data,
  isLoading,
  onDeactivate,
  onEmptyAction,
  searchValue,
  basePath = "/medicines",
  showStockColumns = true,
  showSource = true,
  emptyTitle = "No medicines found",
  emptyDescription = "Add your first medicine or adjust filters.",
  emptyActionLabel = "Add medicine",
  filename = "medicines.csv",
}: MedicineTableProps) {
  const columns: ColumnDef<MedicineListItem>[] = [
    {
      accessorKey: "name",
      header: "Medicine",
      cell: ({ row }) => (
        <div className="min-w-[180px]">
          <Link
            href={`${basePath}/${row.original.id}`}
            className="font-medium text-foreground hover:underline"
          >
            {row.original.name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {row.original.genericName || row.original.brand || "—"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.sku}</span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal">
          {row.original.unit}
        </Badge>
      ),
    },
    ...(showStockColumns
      ? ([
          {
            accessorKey: "totalStock",
            header: "Stock",
            cell: ({ row }) => (
              <StockBadge
                quantity={row.original.totalStock}
                minStockLevel={row.original.minStockLevel}
                reorderPoint={row.original.reorderPoint}
                level={row.original.stockLevel}
              />
            ),
          },
          {
            accessorKey: "nearestExpiry",
            header: "Nearest expiry",
            cell: ({ row }) => formatDate(row.original.nearestExpiry),
          },
        ] as ColumnDef<MedicineListItem>[])
      : []),
    ...(showSource
      ? ([
          {
            id: "source",
            header: "Source",
            cell: ({ row }) =>
              row.original.sku.startsWith("DRAP-") ? (
                <Badge variant="default">DRAP</Badge>
              ) : (
                <Badge variant="outline">Local</Badge>
              ),
          },
        ] as ColumnDef<MedicineListItem>[])
      : []),
    {
      id: "flags",
      header: "Flags",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.requiresPrescription ? (
            <Badge variant="outline">Rx</Badge>
          ) : null}
          {row.original.isControlled ? (
            <Badge variant="default">CTRL</Badge>
          ) : null}
          {!row.original.isActive ? (
            <Badge variant="secondary">Inactive</Badge>
          ) : null}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`${basePath}/${row.original.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${basePath}/${row.original.id}?edit=1`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            {onDeactivate && row.original.isActive ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeactivate(row.original)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      searchKey="name"
      searchValue={searchValue}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyActionLabel={emptyActionLabel}
      onEmptyAction={onEmptyAction}
      filename={filename}
      pageSize={20}
      showPagination={false}
    />
  );
}
