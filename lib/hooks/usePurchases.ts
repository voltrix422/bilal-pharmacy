"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type {
  ApiResponse,
  PaginationMeta,
  POStatus,
  PurchaseOrderDTO,
  StockLocationDTO,
} from "@/types";
import type {
  PurchaseOrderInput,
  PurchaseOrderUpdateInput,
  ReceivePurchaseInput,
} from "@/lib/validations/purchase";

export const purchaseKeys = {
  all: ["purchases"] as const,
  lists: () => [...purchaseKeys.all, "list"] as const,
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    [...purchaseKeys.lists(), params ?? {}] as const,
  details: () => [...purchaseKeys.all, "detail"] as const,
  detail: (id: string) => [...purchaseKeys.details(), id] as const,
};

export interface PurchaseListParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: POStatus;
  supplierId?: string;
}

export interface PurchaseDetailResult {
  purchaseOrder: PurchaseOrderDTO;
  locations: StockLocationDTO[];
}

export interface PurchaseListResult {
  purchases: PurchaseOrderDTO[];
  meta: PaginationMeta;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Request failed");
  }
  if (body?.data === undefined) {
    throw new Error("Invalid response from server");
  }
  return body.data;
}

function toQuery(params?: PurchaseListParams) {
  const query = new URLSearchParams();
  if (!params) return query;
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.status) query.set("status", params.status);
  if (params.supplierId) query.set("supplierId", params.supplierId);
  return query;
}

async function fetchPurchases(
  params?: PurchaseListParams
): Promise<PurchaseListResult> {
  const query = toQuery(params);
  const res = await fetch(`/api/purchases?${query.toString()}`, {
    credentials: "include",
  });
  const body = (await res.json().catch(() => null)) as
    | (ApiResponse<PurchaseOrderDTO[]> & { meta?: PaginationMeta })
    | null;

  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Failed to load purchase orders");
  }

  return {
    purchases: body?.data ?? [],
    meta: {
      page: body?.meta?.page ?? params?.page ?? 1,
      limit: body?.meta?.limit ?? params?.limit ?? 20,
      total: body?.meta?.total ?? 0,
      totalPages: body?.meta?.totalPages ?? 1,
    },
  };
}

async function fetchPurchase(id: string): Promise<PurchaseDetailResult> {
  const res = await fetch(`/api/purchases/${id}`, { credentials: "include" });
  const body = (await res.json().catch(() => null)) as
    | (ApiResponse<PurchaseOrderDTO> & {
        meta?: { locations?: StockLocationDTO[] };
      })
    | null;

  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Failed to load purchase order");
  }
  if (!body?.data) {
    throw new Error("Invalid response from server");
  }

  return {
    purchaseOrder: body.data,
    locations: body.meta?.locations ?? [],
  };
}

async function createPurchase(
  input: PurchaseOrderInput
): Promise<PurchaseOrderDTO> {
  const res = await fetch("/api/purchases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseResponse<PurchaseOrderDTO>(res);
}

async function updatePurchase({
  id,
  data,
}: {
  id: string;
  data:
    | PurchaseOrderUpdateInput
    | { action: "receive"; items: ReceivePurchaseInput["items"] };
}): Promise<PurchaseOrderDTO> {
  const res = await fetch(`/api/purchases/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return parseResponse<PurchaseOrderDTO>(res);
}

export function usePurchases(
  params?: PurchaseListParams,
  options?: Omit<
    UseQueryOptions<PurchaseListResult, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: purchaseKeys.list(
      params as Record<string, string | number | boolean | undefined>
    ),
    queryFn: () => fetchPurchases(params),
    staleTime: 15_000,
    ...options,
  });
}

export function usePurchase(
  id: string,
  options?: Omit<
    UseQueryOptions<PurchaseDetailResult, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: purchaseKeys.detail(id),
    queryFn: () => fetchPurchase(id),
    enabled: Boolean(id),
    staleTime: 15_000,
    ...options,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
    },
  });
}

export function useUpdatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePurchase,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.detail(data.id) });
    },
  });
}

export function useReceivePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      items,
    }: {
      id: string;
      items: ReceivePurchaseInput["items"];
    }) =>
      updatePurchase({
        id,
        data: { action: "receive", items },
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.detail(data.id) });
    },
  });
}
