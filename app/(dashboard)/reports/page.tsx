"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Package,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const REPORTS = [
  {
    title: "Sales",
    description: "Revenue trends, payment mix, cashiers, and top medicines.",
    href: "/reports/sales",
    icon: BarChart3,
  },
  {
    title: "Inventory",
    description: "Stock levels, valuation, and category breakdowns.",
    href: "/reports/inventory",
    icon: Package,
  },
  {
    title: "Expiry",
    description: "Batches nearing expiry with critical and warning windows.",
    href: "/reports/expiry",
    icon: AlertTriangle,
  },
  {
    title: "Financial",
    description: "Revenue, COGS, profit, refunds, and purchase spend.",
    href: "/reports/financial",
    icon: Wallet,
  },
];

export default function ReportsHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Operational and financial analytics for Bilal Pharmacy."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports" },
        ]}
      />

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.href}
              href={report.href}
              prefetch
              className="group active:scale-[0.99]"
            >
              <Card className="h-full transition-colors hover:border-[#1d9851]/40 hover:bg-[#1d9851]/5">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1d9851]/10 text-[#1d9851]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base font-semibold sm:text-lg">
                      {report.title}
                    </CardTitle>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[#1d9851]" />
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <p className="text-sm text-muted-foreground">
                    {report.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
