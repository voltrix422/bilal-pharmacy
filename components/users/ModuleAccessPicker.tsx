"use client";

import { cn } from "@/lib/utils";
import {
  APP_MODULES,
  type ModuleAccessLevel,
  type ModuleAccessMap,
  type ModuleKey,
} from "@/lib/permissions/modules";

const LEVELS: { value: ModuleAccessLevel; label: string }[] = [
  { value: "none", label: "Off" },
  { value: "view", label: "View" },
  { value: "edit", label: "Edit" },
];

export function ModuleAccessPicker({
  value,
  onChange,
  disabled,
}: {
  value: ModuleAccessMap;
  onChange: (next: ModuleAccessMap) => void;
  disabled?: boolean;
}) {
  function setLevel(key: ModuleKey, level: ModuleAccessLevel) {
    onChange({ ...value, [key]: level });
  }

  function cycle(key: ModuleKey) {
    const current = value[key] ?? "none";
    const order: ModuleAccessLevel[] = ["none", "view", "edit"];
    const next = order[(order.indexOf(current) + 1) % order.length];
    setLevel(key, next);
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">Module access</p>
        <p className="text-[11px] text-muted-foreground">
          Tap a module to cycle Off → View → Edit. View = see only; Edit =
          full access in that module.
        </p>
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
        {APP_MODULES.map((mod) => {
          const level = value[mod.key] ?? "none";
          return (
            <div
              key={mod.key}
              className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 hover:bg-muted/50"
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => cycle(mod.key)}
                className="min-w-0 flex-1 truncate text-left text-xs font-medium disabled:opacity-50"
              >
                {mod.label}
              </button>
              <div className="flex shrink-0 gap-0.5">
                {LEVELS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setLevel(mod.key, opt.value)}
                    className={cn(
                      "h-7 rounded-md px-2 text-[10px] font-semibold transition-colors disabled:opacity-50",
                      level === opt.value
                        ? opt.value === "edit"
                          ? "bg-[#1d9851] text-white"
                          : opt.value === "view"
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground"
                        : "bg-transparent text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
