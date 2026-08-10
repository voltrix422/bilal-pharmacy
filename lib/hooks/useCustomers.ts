"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type {
  ApiResponse,
  CustomerDTO,
  PaginationMeta,
  PrescriptionDTO,
  SaleDTO,
} from "@/types";
import type { CustomerInput, CustomerUpdateInput } from "@/lib/validations/customer";

export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    [...customerKeys.lists(), params ?? {}] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

export interface CustomerListParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isActive?: boolean;
}

export interface CustomerDetail extends CustomerDTO {
  sales?: SaleDTO[];
  prescriptions?: PrescriptionDTO[];
  loyaltySummary?: {
    points: number;
    outstandingBalance: number;
    totalPurchases: number;
    totalPrescriptions: number;
    lifetimeSpend: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
  };
  _count?: {
    sales: number;
    prescriptions: number;
    returns: number;
  };
}

export interface CustomerListResult {
  customers: CustomerDTO[];
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

function toQuery(params?: CustomerListParams) {
  const query = new URLSearchParams();
  if (!params) return query;
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.isActive !== undefined) {
    query.set("isActive", String(params.isActive));
  }
  return query;
}

async function fetchCustomers(
  params?: CustomerListParams
): Promise<CustomerListResult> {
  const query = toQuery(params);
  const res = await fetch(`/api/customers?${query.toString()}`, {
    credentials: "include",
  });
  const body = (await res.json().catch(() => null)) as
    | (ApiResponse<CustomerDTO[]> & { meta?: PaginationMeta })
    | null;

  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Failed to load customers");
  }

  return {
    customers: body?.data ?? [],
    meta: {
      page: body?.meta?.page ?? params?.page ?? 1,
      limit: body?.meta?.limit ?? params?.limit ?? 20,
      total: body?.meta?.total ?? 0,
      totalPages: body?.meta?.totalPages ?? 1,
    },
  };
}

async function fetchCustomer(id: string): Promise<CustomerDetail> {
  const res = await fetch(`/api/customers/${id}`, { credentials: "include" });
  return parseResponse<CustomerDetail>(res);
}

async function createCustomer(input: CustomerInput): Promise<CustomerDTO> {
  const res = await fetch("/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseResponse<CustomerDTO>(res);
}

async function updateCustomer({
  id,
  data,
}: {
  id: string;
  data: CustomerUpdateInput;
}): Promise<CustomerDTO> {
  const res = await fetch(`/api/customers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return parseResponse<CustomerDTO>(res);
}

async function deleteCustomer(id: string): Promise<CustomerDTO> {
  const res = await fetch(`/api/customers/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseResponse<CustomerDTO>(res);
}

export function useCustomers(
  params?: CustomerListParams,
  options?: Omit<
    UseQueryOptions<CustomerListResult, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: customerKeys.list(params as Record<string, string | number | boolean | undefined>),
    queryFn: () => fetchCustomers(params),
    staleTime: 15_000,
    ...options,
  });
}

export function useCustomer(
  id: string,
  options?: Omit<
    UseQueryOptions<CustomerDetail, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => fetchCustomer(id),
    enabled: Boolean(id),
    staleTime: 15_000,
    ...options,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCustomer,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(data.id) });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
    },
  });
}
