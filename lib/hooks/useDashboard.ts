"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { ApiResponse, DashboardStats } from "@/types";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: () => [...dashboardKeys.all, "stats"] as const,
};

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch("/api/dashboard/stats", {
    credentials: "include",
  });

  const body = (await res.json().catch(() => null)) as ApiResponse<DashboardStats> | null;

  if (!res.ok || !body?.success || !body.data) {
    throw new Error(body?.error?.message ?? "Failed to load dashboard stats");
  }

  return body.data;
}

export function useDashboardStats(
  options?: Omit<
    UseQueryOptions<DashboardStats, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: fetchDashboardStats,
    staleTime: 30_000,
    refetchInterval: 60_000,
    ...options,
  });
}

export function useDashboard(
  options?: Omit<
    UseQueryOptions<DashboardStats, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useDashboardStats(options);
}
