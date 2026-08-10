"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { TopMedicines } from "@/components/dashboard/TopMedicines";
import { ExpiryAlerts } from "@/components/dashboard/ExpiryAlerts";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { PaymentMethodChart } from "@/components/dashboard/PaymentMethodChart";
import { useDashboard } from "@/lib/hooks/useDashboard";

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard();

  return (
    <div className="space-y-3 md:space-y-2">
      <div className="flex items-end justify-between gap-2 md:hidden">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#1d9851]">
            Overview
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Today at a glance
          </h2>
        </div>
        {isError ? (
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg border border-stroke px-3 py-2 text-xs font-medium active:bg-muted"
          >
            Retry
          </button>
        ) : null}
      </div>

      <PageHeader
        className="hidden md:flex"
        actions={
          isError ? (
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-md border border-stroke px-2.5 py-1.5 text-xs hover:bg-muted"
            >
              Retry
            </button>
          ) : null
        }
      />

      {isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive md:rounded-lg md:py-2">
          {error.message || "Failed to load dashboard data."}
        </div>
      ) : null}

      <StatsCards stats={data} isLoading={isLoading} />

      <div className="grid gap-3 md:gap-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart
            days7={data?.salesChart.days7}
            days30={data?.salesChart.days30}
            isLoading={isLoading}
          />
        </div>
        <PaymentMethodChart
          data={data?.paymentMethods}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-3 md:gap-2 lg:grid-cols-2">
        <TopMedicines data={data?.topMedicines} isLoading={isLoading} />
        <RecentActivity sales={data?.recentSales} isLoading={isLoading} />
      </div>

      <ExpiryAlerts alerts={data?.expiryAlerts} isLoading={isLoading} />
    </div>
  );
}
