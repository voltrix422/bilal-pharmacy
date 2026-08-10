"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { ApiResponse, SettingDTO } from "@/types";
import type { SettingInput } from "@/lib/validations/settings";

export const settingsKeys = {
  all: ["settings"] as const,
  list: () => [...settingsKeys.all, "list"] as const,
};

export type SettingsMap = Record<string, string>;

export interface SettingsResult {
  settings: SettingDTO[];
  map: SettingsMap;
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

function toMap(settings: SettingDTO[]): SettingsMap {
  return settings.reduce<SettingsMap>((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
}

async function fetchSettings(): Promise<SettingsResult> {
  const res = await fetch("/api/settings", { credentials: "include" });
  const settings = await parseResponse<SettingDTO[]>(res);
  return { settings, map: toMap(settings) };
}

async function updateSettings(settings: SettingInput[]): Promise<SettingDTO[]> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ settings }),
  });
  return parseResponse<SettingDTO[]>(res);
}

async function downloadBackup(): Promise<void> {
  const res = await fetch("/api/settings/backup", {
    credentials: "include",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
    throw new Error(body?.error?.message ?? "Failed to export backup");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename =
    match?.[1] ??
    `bilal-pharmacy-backup-${new Date().toISOString().slice(0, 10)}.json`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function useSettings(
  options?: Omit<
    UseQueryOptions<SettingsResult, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: settingsKeys.list(),
    queryFn: fetchSettings,
    staleTime: 30_000,
    ...options,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useBackupExport() {
  return useMutation({
    mutationFn: downloadBackup,
  });
}

export function getSettingValue(
  map: SettingsMap | undefined,
  key: string,
  fallback = ""
): string {
  return map?.[key] ?? fallback;
}
