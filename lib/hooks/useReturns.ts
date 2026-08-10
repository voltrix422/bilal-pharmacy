"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { ApiResponse, PaginationMeta, ReturnDTO } from "@/types";
import type { ReturnInput } from "@/lib/validations/return";

export type ReturnsFilters = {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
  saleId?: string;
  customerId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export const returnKeys = {
  all: ["returns"] as const,
  lists: () => [...returnKeys.all, "list"] as const,
  list: (filters?: ReturnsFilters) =>
    [...returnKeys.lists(), filters ?? {}] as const,
  details: () => [...returnKeys.all, "detail"] as const,
  detail: (id: string) => [...returnKeys.details(), id] as const,
};

export interface ReturnsListResult {
  returns: ReturnDTO[];
  meta: PaginationMeta;
}

function toQueryString(filters?: ReturnsFilters) {
  const params = new URLSearchParams();
  if (!filters) return "";
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function fetchReturns(
  filters?: ReturnsFilters
): Promise<ReturnsListResult> {
  const res = await fetch(`/api/returns${toQueryString(filters)}`, {
    credentials: "include",
  });

  const body = (await res.json().catch(() => null)) as
    | (ApiResponse<ReturnDTO[]> & { meta?: PaginationMeta })
    | null;

  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Failed to load returns");
  }

  return {
    returns: body?.data ?? [],
    meta: {
      page: body?.meta?.page ?? filters?.page ?? 1,
      limit: body?.meta?.limit ?? filters?.limit ?? 20,
      total: body?.meta?.total ?? 0,
      totalPages: body?.meta?.totalPages ?? 1,
    },
  };
}

async function createReturn(payload: ReturnInput): Promise<ReturnDTO> {
  const res = await fetch("/api/returns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = (await res.json().catch(() => null)) as ApiResponse<ReturnDTO> | null;

  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Failed to create return");
  }
  if (!body?.data) {
    throw new Error("Invalid response from server");
  }
  return body.data;
}

export function useReturns(
  filters?: ReturnsFilters,
  options?: Omit<
    UseQueryOptions<ReturnsListResult, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: returnKeys.list(filters),
    queryFn: () => fetchReturns(filters),
    ...options,
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: returnKeys.all });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
