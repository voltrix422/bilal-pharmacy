"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, Save } from "lucide-react";
import { toast } from "sonner";
import {
  getSettingValue,
  useBackupExport,
  useSettings,
  useUpdateSettings,
} from "@/lib/hooks/useSettings";
import type { SettingInput } from "@/lib/validations/settings";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FormState = {
  pharmacyName: string;
  pharmacyAddress: string;
  pharmacyLicense: string;
  pharmacyPhone: string;
  pharmacyLogo: string;
  taxRate: string;
  taxInclusive: boolean;
  currency: string;
  stockLowThreshold: string;
  expiryWarnDays: string;
  expiryCriticalDays: string;
  receiptHeader: string;
  receiptFooter: string;
  loyaltyEnabled: boolean;
  loyaltyPointsPerUnit: string;
  loyaltyRedemptionRate: string;
};

const emptyForm: FormState = {
  pharmacyName: "",
  pharmacyAddress: "",
  pharmacyLicense: "",
  pharmacyPhone: "",
  pharmacyLogo: "",
  taxRate: "0",
  taxInclusive: false,
  currency: "PKR",
  stockLowThreshold: "10",
  expiryWarnDays: "30",
  expiryCriticalDays: "7",
  receiptHeader: "",
  receiptFooter: "",
  loyaltyEnabled: true,
  loyaltyPointsPerUnit: "1",
  loyaltyRedemptionRate: "100",
};

function mapToForm(map: Record<string, string>): FormState {
  return {
    pharmacyName: getSettingValue(map, "pharmacy.name", "Bilal Pharmacy"),
    pharmacyAddress: getSettingValue(map, "pharmacy.address"),
    pharmacyLicense: getSettingValue(map, "pharmacy.license"),
    pharmacyPhone: getSettingValue(map, "pharmacy.phone"),
    pharmacyLogo: getSettingValue(map, "pharmacy.logo"),
    taxRate: getSettingValue(map, "tax.rate", "0"),
    taxInclusive: getSettingValue(map, "tax.inclusive", "false") === "true",
    currency: getSettingValue(map, "currency", "PKR"),
    stockLowThreshold: getSettingValue(map, "stock.lowThreshold", "10"),
    expiryWarnDays: getSettingValue(map, "expiry.warnDays", "30"),
    expiryCriticalDays: getSettingValue(map, "expiry.criticalDays", "7"),
    receiptHeader: getSettingValue(map, "receipt.header"),
    receiptFooter: getSettingValue(map, "receipt.footer"),
    loyaltyEnabled: getSettingValue(map, "loyalty.enabled", "true") !== "false",
    loyaltyPointsPerUnit: getSettingValue(map, "loyalty.pointsPerUnit", "1"),
    loyaltyRedemptionRate: getSettingValue(
      map,
      "loyalty.redemptionRate",
      "100"
    ),
  };
}

function formToSettings(form: FormState): SettingInput[] {
  return [
    {
      key: "pharmacy.name",
      value: form.pharmacyName,
      category: "pharmacy",
      description: "Pharmacy display name",
    },
    {
      key: "pharmacy.address",
      value: form.pharmacyAddress,
      category: "pharmacy",
      description: "Business address",
    },
    {
      key: "pharmacy.license",
      value: form.pharmacyLicense,
      category: "pharmacy",
      description: "Pharmacy license number",
    },
    {
      key: "pharmacy.phone",
      value: form.pharmacyPhone,
      category: "pharmacy",
      description: "Contact phone",
    },
    {
      key: "pharmacy.logo",
      value: form.pharmacyLogo,
      category: "pharmacy",
      description: "Logo image URL",
    },
    {
      key: "tax.rate",
      value: form.taxRate,
      category: "tax",
      description: "Sales tax rate (%)",
    },
    {
      key: "tax.inclusive",
      value: String(form.taxInclusive),
      category: "tax",
      description: "Whether prices include tax",
    },
    {
      key: "currency",
      value: form.currency.toUpperCase(),
      category: "general",
      description: "Default currency code",
    },
    {
      key: "stock.lowThreshold",
      value: form.stockLowThreshold,
      category: "stock",
      description: "Global low stock threshold",
    },
    {
      key: "expiry.warnDays",
      value: form.expiryWarnDays,
      category: "expiry",
      description: "Days before expiry for warning",
    },
    {
      key: "expiry.criticalDays",
      value: form.expiryCriticalDays,
      category: "expiry",
      description: "Days before expiry for critical alert",
    },
    {
      key: "receipt.header",
      value: form.receiptHeader,
      category: "receipt",
      description: "Receipt header text",
    },
    {
      key: "receipt.footer",
      value: form.receiptFooter,
      category: "receipt",
      description: "Receipt footer text",
    },
    {
      key: "loyalty.enabled",
      value: String(form.loyaltyEnabled),
      category: "loyalty",
      description: "Enable loyalty program",
    },
    {
      key: "loyalty.pointsPerUnit",
      value: form.loyaltyPointsPerUnit,
      category: "loyalty",
      description: "Loyalty points earned per currency unit spent",
    },
    {
      key: "loyalty.redemptionRate",
      value: form.loyaltyRedemptionRate,
      category: "loyalty",
      description: "Points required per 1 currency unit discount",
    },
  ];
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = session?.user?.role;
  const canEdit = role === "ADMIN" || role === "MANAGER";
  const canBackup = role === "ADMIN";

  const { data, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const backupMutation = useBackupExport();

  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    if (
      status === "authenticated" &&
      role &&
      !["ADMIN", "MANAGER", "PHARMACIST"].includes(role)
    ) {
      router.replace("/dashboard");
    }
  }, [status, role, router]);

  React.useEffect(() => {
    if (data?.map) {
      setForm(mapToForm(data.map));
      setHydrated(true);
    }
  }, [data?.map]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!canEdit) {
      toast.error("You have read-only access to settings");
      return;
    }
    try {
      await updateMutation.mutateAsync(formToSettings(form));
      toast.success("Settings saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      );
    }
  };

  const handleBackup = async () => {
    if (!canBackup) {
      toast.error("Only administrators can export backups");
      return;
    }
    try {
      await backupMutation.mutateAsync();
      toast.success("Backup downloaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export backup"
      );
    }
  };

  if (
    status === "loading" ||
    isLoading ||
    !hydrated ||
    (status === "authenticated" &&
      role &&
      !["ADMIN", "MANAGER", "PHARMACIST"].includes(role))
  ) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description={
          canEdit
            ? "Configure pharmacy profile, tax, stock alerts, receipts, and loyalty."
            : "View pharmacy configuration (read-only)."
        }
        actions={
          canEdit ? (
            <Button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save changes
            </Button>
          ) : null
        }
      />

      <Tabs defaultValue="pharmacy" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="pharmacy">Pharmacy</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="currency">Currency</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="expiry">Expiry</TabsTrigger>
          <TabsTrigger value="receipt">Receipt</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          {canBackup ? (
            <TabsTrigger value="backup">Backup</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="pharmacy">
          <Card>
            <CardHeader>
              <CardTitle>Pharmacy profile</CardTitle>
              <CardDescription>
                Public business details shown on receipts and reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pharmacyName">Pharmacy name</Label>
                <Input
                  id="pharmacyName"
                  value={form.pharmacyName}
                  disabled={!canEdit}
                  onChange={(e) => setField("pharmacyName", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pharmacyAddress">Address</Label>
                <Textarea
                  id="pharmacyAddress"
                  value={form.pharmacyAddress}
                  disabled={!canEdit}
                  onChange={(e) => setField("pharmacyAddress", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pharmacyLicense">License</Label>
                <Input
                  id="pharmacyLicense"
                  value={form.pharmacyLicense}
                  disabled={!canEdit}
                  onChange={(e) => setField("pharmacyLicense", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pharmacyPhone">Phone</Label>
                <Input
                  id="pharmacyPhone"
                  value={form.pharmacyPhone}
                  disabled={!canEdit}
                  onChange={(e) => setField("pharmacyPhone", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pharmacyLogo">Logo URL</Label>
                <Input
                  id="pharmacyLogo"
                  value={form.pharmacyLogo}
                  disabled={!canEdit}
                  onChange={(e) => setField("pharmacyLogo", e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <CardTitle>Tax</CardTitle>
              <CardDescription>
                Default sales tax applied at checkout.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="taxRate">Tax rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.taxRate}
                  disabled={!canEdit}
                  onChange={(e) => setField("taxRate", e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2 sm:mt-6">
                <div>
                  <Label htmlFor="taxInclusive">Tax inclusive prices</Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, shelf prices already include tax.
                  </p>
                </div>
                <Switch
                  id="taxInclusive"
                  checked={form.taxInclusive}
                  disabled={!canEdit}
                  onCheckedChange={(v) => setField("taxInclusive", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency">
          <Card>
            <CardHeader>
              <CardTitle>Currency</CardTitle>
              <CardDescription>
                ISO currency code used across POS and reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-w-xs space-y-1.5">
              <Label htmlFor="currency">Currency code</Label>
              <Input
                id="currency"
                value={form.currency}
                disabled={!canEdit}
                maxLength={3}
                onChange={(e) =>
                  setField("currency", e.target.value.toUpperCase())
                }
                placeholder="PKR"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle>Stock thresholds</CardTitle>
              <CardDescription>
                Global default for low-stock alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-w-xs space-y-1.5">
              <Label htmlFor="stockLowThreshold">Low stock threshold</Label>
              <Input
                id="stockLowThreshold"
                type="number"
                min={0}
                value={form.stockLowThreshold}
                disabled={!canEdit}
                onChange={(e) =>
                  setField("stockLowThreshold", e.target.value)
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiry">
          <Card>
            <CardHeader>
              <CardTitle>Expiry thresholds</CardTitle>
              <CardDescription>
                Days before expiry for warning and critical alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="expiryWarnDays">Warning (days)</Label>
                <Input
                  id="expiryWarnDays"
                  type="number"
                  min={1}
                  value={form.expiryWarnDays}
                  disabled={!canEdit}
                  onChange={(e) => setField("expiryWarnDays", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiryCriticalDays">Critical (days)</Label>
                <Input
                  id="expiryCriticalDays"
                  type="number"
                  min={1}
                  value={form.expiryCriticalDays}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setField("expiryCriticalDays", e.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt">
          <Card>
            <CardHeader>
              <CardTitle>Receipt customization</CardTitle>
              <CardDescription>
                Header and footer printed on sales receipts.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="receiptHeader">Header</Label>
                <Textarea
                  id="receiptHeader"
                  value={form.receiptHeader}
                  disabled={!canEdit}
                  onChange={(e) => setField("receiptHeader", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="receiptFooter">Footer</Label>
                <Textarea
                  id="receiptFooter"
                  value={form.receiptFooter}
                  disabled={!canEdit}
                  onChange={(e) => setField("receiptFooter", e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty program</CardTitle>
              <CardDescription>
                Points earning and redemption rules for customers.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border px-3 py-2 sm:col-span-2">
                <div>
                  <Label htmlFor="loyaltyEnabled">Enable loyalty</Label>
                  <p className="text-xs text-muted-foreground">
                    Award and redeem points at checkout.
                  </p>
                </div>
                <Switch
                  id="loyaltyEnabled"
                  checked={form.loyaltyEnabled}
                  disabled={!canEdit}
                  onCheckedChange={(v) => setField("loyaltyEnabled", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loyaltyPointsPerUnit">
                  Points per currency unit
                </Label>
                <Input
                  id="loyaltyPointsPerUnit"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.loyaltyPointsPerUnit}
                  disabled={!canEdit || !form.loyaltyEnabled}
                  onChange={(e) =>
                    setField("loyaltyPointsPerUnit", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loyaltyRedemptionRate">
                  Points per 1 currency discount
                </Label>
                <Input
                  id="loyaltyRedemptionRate"
                  type="number"
                  min={0}
                  step="1"
                  value={form.loyaltyRedemptionRate}
                  disabled={!canEdit || !form.loyaltyEnabled}
                  onChange={(e) =>
                    setField("loyaltyRedemptionRate", e.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canBackup ? (
          <TabsContent value="backup">
            <Card>
              <CardHeader>
                <CardTitle>Database backup</CardTitle>
                <CardDescription>
                  Export major tables as a downloadable JSON snapshot
                  (ADMIN only).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Includes users (without passwords), medicines, batches,
                  suppliers, customers, purchases, prescriptions, sales,
                  returns, settings, and recent audit logs.
                </p>
                <Button
                  type="button"
                  onClick={handleBackup}
                  disabled={backupMutation.isPending}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {backupMutation.isPending
                    ? "Exporting…"
                    : "Export DB as JSON"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
