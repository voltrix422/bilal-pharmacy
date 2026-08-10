"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import type { PrescriptionStatus } from "@/types";
import {
  usePrescription,
  useUpdatePrescription,
} from "@/lib/hooks/usePrescriptions";
import { formatDate } from "@/lib/utils/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageSkeleton } from "@/components/shared/LoadingSpinner";
import { PrescriptionForm } from "@/components/prescriptions/PrescriptionForm";
import { DispensingModal } from "@/components/prescriptions/DispensingModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function PrescriptionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { data: prescription, isLoading, error, refetch } = usePrescription(id);
  const updateMutation = useUpdatePrescription();
  const [editOpen, setEditOpen] = React.useState(false);
  const [dispenseOpen, setDispenseOpen] = React.useState(false);

  const setStatus = async (status: PrescriptionStatus) => {
    if (!prescription) return;
    try {
      await updateMutation.mutateAsync({
        id: prescription.id,
        data: { status },
      });
      toast.success(`Status updated to ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  if (isLoading) return <PageSkeleton />;

  if (error || !prescription) {
    return (
      <div className="space-y-4">
        <PageHeader title="Prescription not found" />
        <Button asChild variant="outline">
          <Link href="/prescriptions">Back to prescriptions</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={prescription.prescriptionNumber}
        description={`Dr. ${prescription.doctorName} · ${prescription.customer?.name ?? "Patient"}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Prescriptions", href: "/prescriptions" },
          { label: prescription.prescriptionNumber },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/prescriptions">Back</Link>
            </Button>
            {prescription.status !== "DISPENSED" &&
            prescription.status !== "CANCELLED" ? (
              <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            ) : null}
            {prescription.status === "PENDING" ? (
              <Button
                type="button"
                onClick={() => void setStatus("VERIFIED")}
                disabled={updateMutation.isPending}
              >
                Verify
              </Button>
            ) : null}
            {prescription.status === "VERIFIED" ? (
              <Button type="button" onClick={() => setDispenseOpen(true)}>
                Dispense
              </Button>
            ) : null}
            {prescription.status === "PENDING" ||
            prescription.status === "VERIFIED" ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void setStatus("CANCELLED")}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Details</CardTitle>
            <Badge variant={STATUS_VARIANT[prescription.status]}>
              {prescription.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Patient</p>
              <p className="font-medium">
                {prescription.customer ? (
                  <Link
                    href={`/customers/${prescription.customer.id}`}
                    className="hover:underline"
                  >
                    {prescription.customer.name}
                  </Link>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Doctor</p>
              <p className="font-medium">{prescription.doctorName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">License</p>
              <p className="font-medium">{prescription.doctorLicense || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Clinic</p>
              <p className="font-medium">{prescription.hospitalClinic || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Issued</p>
              <p className="font-medium">{formatDate(prescription.issuedDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Expires</p>
              <p className="font-medium">{formatDate(prescription.expiryDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Notes</p>
              <p className="font-medium">{prescription.notes || "—"}</p>
            </div>
            {prescription.customer?.allergies ? (
              <div>
                <p className="text-muted-foreground">Patient allergies</p>
                <p className="font-medium text-destructive">
                  {prescription.customer.allergies}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Dispensed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(prescription.items ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.medicine?.name ?? item.medicineId}
                    </TableCell>
                    <TableCell>{item.dosage}</TableCell>
                    <TableCell>{item.frequency}</TableCell>
                    <TableCell>{item.duration || "—"}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {item.dispensedQuantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit prescription</DialogTitle>
          </DialogHeader>
          <PrescriptionForm
            prescription={prescription}
            onCancel={() => setEditOpen(false)}
            onSuccess={() => {
              setEditOpen(false);
              void refetch();
            }}
          />
        </DialogContent>
      </Dialog>

      <DispensingModal
        open={dispenseOpen}
        onOpenChange={setDispenseOpen}
        prescription={prescription}
      />
    </div>
  );
}
