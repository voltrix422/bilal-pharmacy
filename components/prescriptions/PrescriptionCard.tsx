"use client";

import Link from "next/link";
import type { PrescriptionDTO, PrescriptionStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

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

export interface PrescriptionCardProps {
  prescription: PrescriptionDTO;
  className?: string;
  onDispense?: (prescription: PrescriptionDTO) => void;
  showActions?: boolean;
}

export function PrescriptionCard({
  prescription,
  className,
  onDispense,
  showActions = true,
}: PrescriptionCardProps) {
  const itemCount = prescription.items?.length ?? 0;
  const canDispense =
    prescription.status === "VERIFIED" && typeof onDispense === "function";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="truncate font-display text-lg">
            <Link
              href={`/prescriptions/${prescription.id}`}
              className="hover:underline"
            >
              {prescription.prescriptionNumber}
            </Link>
          </CardTitle>
          <p className="truncate text-sm text-muted-foreground">
            {prescription.customer?.name ?? "Unknown patient"} · Dr.{" "}
            {prescription.doctorName}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[prescription.status]}>
          {prescription.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Issued</p>
            <p className="font-medium">{formatDate(prescription.issuedDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Expires</p>
            <p className="font-medium">{formatDate(prescription.expiryDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Items</p>
            <p className="font-medium">{itemCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Clinic</p>
            <p className="truncate font-medium">
              {prescription.hospitalClinic || "—"}
            </p>
          </div>
        </div>

        {prescription.items && prescription.items.length > 0 ? (
          <ul className="space-y-1.5 rounded-md border bg-muted/30 p-3 text-sm">
            {prescription.items.slice(0, 3).map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {item.medicine?.name ?? item.medicineId}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {item.dispensedQuantity}/{item.quantity}
                </span>
              </li>
            ))}
            {prescription.items.length > 3 ? (
              <li className="text-xs text-muted-foreground">
                +{prescription.items.length - 3} more
              </li>
            ) : null}
          </ul>
        ) : null}

        {showActions ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/prescriptions/${prescription.id}`}>View</Link>
            </Button>
            {canDispense ? (
              <Button size="sm" onClick={() => onDispense?.(prescription)}>
                Dispense
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
