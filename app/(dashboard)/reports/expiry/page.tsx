"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { ExpiryReport } from "@/components/reports/ExpiryReport";

export default function ExpiryReportPage() {
  return (
    <div className="space-y-2">
      <PageHeader
        title="Expiry report"
        description="Identify batches at risk of expiry before they become waste."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports", href: "/reports" },
          { label: "Expiry" },
        ]}
      />
      <ExpiryReport />
    </div>
  );
}
