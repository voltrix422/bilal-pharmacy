"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { PageSkeleton } from "@/components/shared/LoadingSpinner";
import { useSupplier } from "@/lib/hooks/useSuppliers";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils/format";
import type { POStatus, PurchaseOrderDTO } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { data: supplier, isLoading, error } = useSupplier(id);

  const poColumns = React.useMemo<ColumnDef<PurchaseOrderDTO>[]>(
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
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        accessorKey: "expectedDate",
        header: "Expected",
        cell: ({ row }) => formatDate(row.original.expectedDate),
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
        accessorKey: "totalAmount",
        header: "Amount",
        cell: ({ row }) => formatCurrency(row.original.totalAmount),
      },
    ],
    []
  );

  if (isLoading) return <PageSkeleton />;

  if (error || !supplier) {
    return (
      <div className="space-y-4">
        <PageHeader title="Supplier not found" />
        <Button asChild variant="outline">
          <Link href="/suppliers">Back to suppliers</Link>
        </Button>
      </div>
    );
  }

  const payables = supplier.payables;

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        description="Purchase order history and payable summary."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Suppliers", href: "/suppliers" },
          { label: supplier.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/suppliers">Back</Link>
            </Button>
            <Button asChild>
              <Link href={`/purchases?supplierId=${supplier.id}`}>
                New purchase order
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open payables
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(payables?.openAmount ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open orders
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {payables?.openOrders ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total ordered
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(payables?.totalOrdered ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Received orders
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {payables?.receivedOrders ?? 0}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Supplier profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Contact</p>
              <p className="font-medium">{supplier.contactPerson || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">{formatPhone(supplier.phone)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{supplier.email || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Address</p>
              <p className="font-medium">
                {[supplier.address, supplier.city, supplier.country]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Tax ID</p>
              <p className="font-medium">{supplier.taxId || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Payment terms</p>
              <p className="font-medium">{supplier.paymentTerms || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rating</p>
              <p className="font-medium">{supplier.rating ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge variant={supplier.isActive ? "success" : "secondary"}>
                {supplier.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Notes</p>
              <p className="font-medium">{supplier.notes || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Purchase order history</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={poColumns}
              data={supplier.purchaseOrders ?? []}
              filename={`${supplier.name}-purchase-orders.csv`}
              emptyTitle="No purchase orders"
              emptyDescription="Purchase orders for this supplier will appear here."
              showColumnToggle={false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
