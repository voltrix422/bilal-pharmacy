"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Receipt } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { FilterPanel } from "@/components/shared/FilterPanel";
import { SearchBar } from "@/components/shared/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSales, type SalesFilters } from "@/lib/hooks/useSales";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { SaleDTO } from "@/types";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  COMPLETED: "success",
  PENDING: "warning",
  CANCELLED: "destructive",
  REFUNDED: "secondary",
};

export default function SalesPage() {
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState<Record<string, string>>({
    date: "",
    paymentMethod: "",
    status: "",
  });
  const [page, setPage] = React.useState(1);

  const queryFilters: SalesFilters = {
    page,
    limit: 50,
    search: search || undefined,
    date: filters.date || undefined,
    paymentMethod: filters.paymentMethod || undefined,
    status: filters.status || undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  };

  const { data, isLoading, isFetching } = useSales(queryFilters);
  const sales = data?.sales ?? [];
  const meta = data?.meta;

  const columns = React.useMemo<ColumnDef<SaleDTO>[]>(
    () => [
      {
        accessorKey: "saleNumber",
        header: "Sale #",
        cell: ({ row }) => (
          <Link
            href={`/sales/${row.original.id}`}
            className="font-medium text-pharmacy-700 hover:underline"
          >
            {row.original.saleNumber}
          </Link>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: "customer",
        header: "Customer",
        cell: ({ row }) => row.original.customer?.name ?? "Walk-in",
      },
      {
        id: "cashier",
        header: "Cashier",
        cell: ({ row }) => row.original.cashier?.name ?? "—",
      },
      {
        accessorKey: "paymentMethod",
        header: "Payment",
        cell: ({ row }) =>
          row.original.paymentMethod.replace("_", " "),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status] ?? "outline"}>
            {row.original.status}
            {row.original.isHeld ? " · Held" : ""}
          </Badge>
        ),
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => (
          <span className="font-medium">
            {formatCurrency(row.original.total)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href={`/sales/${row.original.id}`}>
              <Eye className="h-4 w-4" />
              View
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
        title="Sales history"
        description="Filter and review completed, pending, and held sales."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Sales" },
        ]}
        actions={
          <Button asChild variant="primary" className="gap-1">
            <Link href="/pos">
              <Receipt className="h-4 w-4" />
              Open POS
            </Link>
          </Button>
        }
      />

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search sale #, customer, cashier…"
          className="w-full flex-1 sm:max-w-xs"
        />
        <FilterPanel
          fields={[
            { id: "date", label: "Date", type: "date" },
            {
              id: "paymentMethod",
              label: "Payment method",
              options: [
                { label: "Cash", value: "CASH" },
                { label: "Card", value: "CARD" },
                { label: "Insurance", value: "INSURANCE" },
                { label: "Mobile payment", value: "MOBILE_PAYMENT" },
              ],
            },
            {
              id: "status",
              label: "Status",
              options: [
                { label: "Completed", value: "COMPLETED" },
                { label: "Pending", value: "PENDING" },
                { label: "Cancelled", value: "CANCELLED" },
                { label: "Refunded", value: "REFUNDED" },
              ],
            },
          ]}
          values={filters}
          onChange={(v) => {
            setFilters(v);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={sales}
        isLoading={isLoading || isFetching}
        emptyTitle="No sales found"
        emptyDescription="Try adjusting filters or create a sale from POS."
        pageSize={20}
        filename="sales.csv"
      />

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {meta.page} of {meta.totalPages} · {meta.total} sales
          </span>
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
              disabled={page >= meta.totalPages}
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
