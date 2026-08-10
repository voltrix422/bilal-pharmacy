"use client";

import * as React from "react";
import { toast } from "sonner";
import type { BatchDTO, PrescriptionDTO, PrescriptionItemDTO } from "@/types";
import {
  useDispensePrescription,
  usePrescription,
} from "@/lib/hooks/usePrescriptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { formatDate } from "@/lib/utils/format";

type MedicineWithBatches = NonNullable<PrescriptionItemDTO["medicine"]> & {
  batches?: BatchDTO[];
};

type ItemWithBatches = PrescriptionItemDTO & {
  medicine?: MedicineWithBatches | null;
};

interface DispenseLineState {
  itemId: string;
  batchId: string;
  dispensedQuantity: number;
  maxQuantity: number;
  medicineName: string;
  batches: BatchDTO[];
}

export interface DispensingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: PrescriptionDTO | null;
}

export function DispensingModal({
  open,
  onOpenChange,
  prescription,
}: DispensingModalProps) {
  const prescriptionId = prescription?.id ?? "";
  const { data: fullPrescription, isLoading } = usePrescription(prescriptionId, {
    enabled: open && Boolean(prescriptionId),
  });
  const activePrescription = fullPrescription ?? prescription;
  const dispenseMutation = useDispensePrescription();
  const [lines, setLines] = React.useState<DispenseLineState[]>([]);

  React.useEffect(() => {
    if (!activePrescription?.items) {
      setLines([]);
      return;
    }

    const next = (activePrescription.items as ItemWithBatches[])
      .filter((item) => item.dispensedQuantity < item.quantity)
      .map((item) => {
        const remaining = item.quantity - item.dispensedQuantity;
        const batches = (item.medicine?.batches ?? []).filter(
          (batch) => batch.remainingQuantity > 0
        );
        const preferred = batches[0];
        return {
          itemId: item.id,
          batchId: preferred?.id ?? "",
          dispensedQuantity: remaining,
          maxQuantity: remaining,
          medicineName: item.medicine?.name ?? item.medicineId,
          batches,
        };
      });

    setLines(next);
  }, [activePrescription]);

  const updateLine = (itemId: string, patch: Partial<DispenseLineState>) => {
    setLines((prev) =>
      prev.map((line) =>
        line.itemId === itemId ? { ...line, ...patch } : line
      )
    );
  };

  const handleConfirm = async () => {
    if (!activePrescription) return;

    const invalid = lines.find(
      (line) =>
        !line.batchId ||
        line.dispensedQuantity < 1 ||
        line.dispensedQuantity > line.maxQuantity
    );
    if (invalid) {
      toast.error("Select a batch and valid quantity for each item");
      return;
    }

    try {
      await dispenseMutation.mutateAsync({
        id: activePrescription.id,
        items: lines.map((line) => ({
          itemId: line.itemId,
          batchId: line.batchId,
          dispensedQuantity: line.dispensedQuantity,
        })),
      });
      toast.success("Prescription dispensed successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to dispense"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dispense prescription</DialogTitle>
          <DialogDescription>
            {activePrescription
              ? `${activePrescription.prescriptionNumber} · ${activePrescription.customer?.name ?? "Patient"}`
              : "Select batches and confirm quantities."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">
            Loading batch availability...
          </p>
        ) : lines.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No remaining items to dispense.
          </p>
        ) : (
          <div className="space-y-4">
            {lines.map((line) => (
              <div
                key={line.itemId}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{line.medicineName}</p>
                    <p className="text-xs text-muted-foreground">
                      Remaining: {line.maxQuantity}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Batch</Label>
                    <Select
                      value={line.batchId}
                      onValueChange={(value) =>
                        updateLine(line.itemId, { batchId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {line.batches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.batchNumber} · qty {batch.remainingQuantity} ·
                            exp {formatDate(batch.expiryDate)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {line.batches.length === 0 ? (
                      <p className="text-xs text-destructive">
                        No usable batches in stock
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      max={line.maxQuantity}
                      value={line.dispensedQuantity}
                      onChange={(e) =>
                        updateLine(line.itemId, {
                          dispensedQuantity: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={dispenseMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={
              dispenseMutation.isPending || lines.length === 0 || isLoading
            }
          >
            {dispenseMutation.isPending ? "Dispensing..." : "Confirm dispense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
