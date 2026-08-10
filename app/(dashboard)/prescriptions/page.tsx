"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import type { PrescriptionDTO, PrescriptionStatus } from "@/types";
import {
  usePrescriptions,
  useUpdatePrescription,
} from "@/lib/hooks/usePrescriptions";
import { formatDate } from "@/lib/utils/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchBar } from "@/components/shared/SearchBar";
import { PageSkeleton } from "@/components/shared/LoadingSpinner";
import { PrescriptionCard } from "@/components/prescriptions/PrescriptionCard";
import { PrescriptionForm } from "@/components/prescriptions/PrescriptionForm";
import { DispensingModal } from "@/components/prescriptions/DispensingModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_VARIANT: Record<
  PrescriptionStatus,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  PENDING: "warning",
  VERIFIED: "default",
  DISPENSED: "success",
  EXPIRED: "destructive",
  CANCELLED: "secondary",
};

function PrescriptionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCustomerId = searchParams.get("customerId") ?? undefined;

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<PrescriptionStatus | "ALL">("ALL");
  const [createOpen, setCreateOpen] = React.useState(Boolean(defaultCustomerId));
  const [dispenseTarget, setDispenseTarget] =
    React.useState<PrescriptionDTO | null>(null);

  const { data, isLoading, refetch } = usePrescriptions({
    search,
    status: status === "ALL" ? undefined : status,
    customerId: defaultCustomerId,
    limit: 100,
  });
  const updateMutation = useUpdatePrescription();

  const verify = async (prescription: PrescriptionDTO) => {
    try {
      await updateMutation.mutateAsync({
        id: prescription.id,
        data: { status: "VERIFIED" },
      });
      toast.success("Prescription verified");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to verify"
      );
    }
  };

  const columns = React.useMemo<ColumnDef<PrescriptionDTO>[]>(
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
        id: "customer",
        header: "Patient",
        accessorFn: (row) => row.customer?.name ?? "",
        cell: ({ row }) => row.original.customer?.name ?? "—",
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
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status]}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "items",
        header: "Items",
        cell: ({ row }) => row.original.items?.length ?? 0,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link href={`/prescriptions/${row.original.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            {row.original.status === "PENDING" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void verify(row.original)}
              >
                Verify
              </Button>
            ) : null}
            {row.original.status === "VERIFIED" ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setDispenseTarget(row.original)}
              >
                Dispense
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prescriptions"
        description="Capture, verify, and dispense prescriptions."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Prescriptions" },
        ]}
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New prescription
          </Button>
        }
      />

      <Tabs defaultValue="table">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="cards">Cards</TabsTrigger>
          </TabsList>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search Rx #, doctor, patient..."
            />
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as PrescriptionStatus | "ALL")
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="DISPENSED">Dispensed</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="table">
          <DataTable
            columns={columns}
            data={data?.prescriptions ?? []}
            isLoading={isLoading}
            filename="prescriptions.csv"
            emptyTitle="No prescriptions"
            emptyDescription="Create a prescription to start the verify → dispense workflow."
            emptyActionLabel="New prescription"
            onEmptyAction={() => setCreateOpen(true)}
          />
        </TabsContent>

        <TabsContent value="cards">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (data?.prescriptions?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No prescriptions found.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(data?.prescriptions ?? []).map((prescription) => (
                <PrescriptionCard
                  key={prescription.id}
                  prescription={prescription}
                  onDispense={setDispenseTarget}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New prescription</DialogTitle>
          </DialogHeader>
          <PrescriptionForm
            defaultCustomerId={defaultCustomerId}
            onCancel={() => setCreateOpen(false)}
            onSuccess={(created) => {
              setCreateOpen(false);
              void refetch();
              router.push(`/prescriptions/${created.id}`);
            }}
          />
        </DialogContent>
      </Dialog>

      <DispensingModal
        open={Boolean(dispenseTarget)}
        onOpenChange={(open) => !open && setDispenseTarget(null)}
        prescription={dispenseTarget}
      />
    </div>
  );
}

export default function PrescriptionsPage() {
  return (
    <React.Suspense fallback={<PageSkeleton />}>
      <PrescriptionsPageContent />
    </React.Suspense>
  );
}
