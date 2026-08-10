"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { PageSkeleton } from "@/components/shared/LoadingSpinner";
import { useCustomer } from "@/lib/hooks/useCustomers";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils/format";
import type { PrescriptionDTO, SaleDTO } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { data: customer, isLoading, error } = useCustomer(id);

  const saleColumns = React.useMemo<ColumnDef<SaleDTO>[]>(
    () => [
      {
        accessorKey: "saleNumber",
        header: "Sale #",
        cell: ({ row }) => (
          <Link
            href={`/sales/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.saleNumber}
          </Link>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
      },
      {
        accessorKey: "paymentMethod",
        header: "Payment",
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => formatCurrency(row.original.total),
      },
      {
        accessorKey: "loyaltyEarned",
        header: "Points earned",
      },
    ],
    []
  );

  const rxColumns = React.useMemo<ColumnDef<PrescriptionDTO>[]>(
    () => [
      {
        accessorKey: "prescriptionNumber",
        header: "Rx #",
        cell: ({ row }) => (
          <Link
            href={`/prescriptions/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.prescriptionNumber}
          </Link>
        ),
      },
      {
        accessorKey: "doctorName",
        header: "Doctor",
      },
      {
        accessorKey: "issuedDate",
        header: "Issued",
        cell: ({ row }) => formatDate(row.original.issuedDate),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge>{row.original.status}</Badge>,
      },
    ],
    []
  );

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <PageHeader title="Customer not found" />
        <Button asChild variant="outline">
          <Link href="/customers">Back to customers</Link>
        </Button>
      </div>
    );
  }

  const loyalty = customer.loyaltySummary;

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description="Customer profile, purchases, prescriptions, and loyalty."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Customers", href: "/customers" },
          { label: customer.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/customers">Back</Link>
            </Button>
            <Button asChild>
              <Link href={`/prescriptions?customerId=${customer.id}`}>
                New prescription
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Loyalty points
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loyalty?.points ?? customer.loyaltyPoints}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding balance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(
              loyalty?.outstandingBalance ?? customer.outstandingBalance
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lifetime spend
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(loyalty?.lifetimeSpend ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Purchases / Rx
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loyalty?.totalPurchases ?? 0} / {loyalty?.totalPrescriptions ?? 0}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">{formatPhone(customer.phone)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{customer.email || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date of birth</p>
              <p className="font-medium">{formatDate(customer.dateOfBirth)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Gender</p>
              <p className="font-medium capitalize">{customer.gender || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Address</p>
              <p className="font-medium">{customer.address || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Allergies</p>
              <p className="font-medium text-destructive">
                {customer.allergies || "None recorded"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Medical history</p>
              <p className="font-medium">{customer.medicalHistory || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Insurance</p>
              <p className="font-medium">
                {customer.insuranceProvider || "—"}
                {customer.insuranceNumber
                  ? ` · ${customer.insuranceNumber}`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge variant={customer.isActive ? "success" : "secondary"}>
                {customer.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Loyalty summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Points earned</p>
              <p className="text-xl font-semibold">
                {loyalty?.lifetimeEarned ?? 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Points redeemed</p>
              <p className="text-xl font-semibold">
                {loyalty?.lifetimeRedeemed ?? 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current balance</p>
              <p className="text-xl font-semibold">
                {loyalty?.points ?? customer.loyaltyPoints}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="purchases">
        <TabsList>
          <TabsTrigger value="purchases">Purchase history</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
        </TabsList>
        <TabsContent value="purchases" className="mt-4">
          <DataTable
            columns={saleColumns}
            data={customer.sales ?? []}
            filename={`${customer.name}-purchases.csv`}
            emptyTitle="No purchases"
            emptyDescription="Sales linked to this customer will appear here."
            showExport
          />
        </TabsContent>
        <TabsContent value="prescriptions" className="mt-4">
          <DataTable
            columns={rxColumns}
            data={customer.prescriptions ?? []}
            filename={`${customer.name}-prescriptions.csv`}
            emptyTitle="No prescriptions"
            emptyDescription="Prescriptions for this customer will appear here."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
