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
  PrescriptionDTO,
  PrescriptionStatus,
} from "@/types";
import type {
  DispensePrescriptionInput,
  PrescriptionInput,
  PrescriptionUpdateInput,
} from "@/lib/validations/prescription";

export const prescriptionKeys = {
  all: ["prescriptions"] as const,
  lists: () => [...prescriptionKeys.all, "list"] as const,
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    [...prescriptionKeys.lists(), params ?? {}] as const,
  details: () => [...prescriptionKeys.all, "detail"] as const,
  detail: (id: string) => [...prescriptionKeys.details(), id] as const,
};

export interface PrescriptionListParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: PrescriptionStatus;
  customerId?: string;
}

export interface PrescriptionListResult {
  prescriptions: PrescriptionDTO[];
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

function toQuery(params?: PrescriptionListParams) {
  const query = new URLSearchParams();
  if (!params) return query;
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.status) query.set("status", params.status);
  if (params.customerId) query.set("customerId", params.customerId);
  return query;
}

async function fetchPrescriptions(
  params?: PrescriptionListParams
): Promise<PrescriptionListResult> {
  const query = toQuery(params);
  const res = await fetch(`/api/prescriptions?${query.toString()}`, {
    credentials: "include",
  });
  const body = (await res.json().catch(() => null)) as
    | (ApiResponse<PrescriptionDTO[]> & { meta?: PaginationMeta })
    | null;

  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Failed to load prescriptions");
  }

  return {
    prescriptions: body?.data ?? [],
    meta: {
      page: body?.meta?.page ?? params?.page ?? 1,
      limit: body?.meta?.limit ?? params?.limit ?? 20,
      total: body?.meta?.total ?? 0,
      totalPages: body?.meta?.totalPages ?? 1,
    },
  };
}

async function fetchPrescription(id: string): Promise<PrescriptionDTO> {
  const res = await fetch(`/api/prescriptions/${id}`, {
    credentials: "include",
  });
  return parseResponse<PrescriptionDTO>(res);
}

async function createPrescription(
  input: PrescriptionInput
): Promise<PrescriptionDTO> {
  const res = await fetch("/api/prescriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseResponse<PrescriptionDTO>(res);
}

async function updatePrescription({
  id,
  data,
}: {
  id: string;
  data: PrescriptionUpdateInput | { action: "dispense"; items: DispensePrescriptionInput["items"] };
}): Promise<PrescriptionDTO> {
  const res = await fetch(`/api/prescriptions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return parseResponse<PrescriptionDTO>(res);
}

export function usePrescriptions(
  params?: PrescriptionListParams,
  options?: Omit<
    UseQueryOptions<PrescriptionListResult, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: prescriptionKeys.list(
      params as Record<string, string | number | boolean | undefined>
    ),
    queryFn: () => fetchPrescriptions(params),
    staleTime: 15_000,
    ...options,
  });
}

export function usePrescription(
  id: string,
  options?: Omit<
    UseQueryOptions<PrescriptionDTO, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: prescriptionKeys.detail(id),
    queryFn: () => fetchPrescription(id),
    enabled: Boolean(id),
    staleTime: 15_000,
    ...options,
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPrescription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.lists() });
    },
  });
}

export function useUpdatePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePrescription,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: prescriptionKeys.detail(data.id),
      });
    },
  });
}

export function useDispensePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      items,
    }: {
      id: string;
      items: DispensePrescriptionInput["items"];
    }) =>
      updatePrescription({
        id,
        data: { action: "dispense", items },
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: prescriptionKeys.detail(data.id),
      });
    },
  });
}
