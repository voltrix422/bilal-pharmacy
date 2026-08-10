"use client";

import * as React from "react";
import { ChevronDown, Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FilterOption = {
  label: string;
  value: string;
};

export type FilterField = {
  id: string;
  label: string;
  type?: "select" | "date" | "text";
  options?: FilterOption[];
  placeholder?: string;
};

export interface FilterPanelProps {
  fields: FilterField[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  onReset?: () => void;
  className?: string;
  title?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function FilterPanel({
  fields,
  values,
  onChange,
  onReset,
  className,
  title = "Filters",
}: FilterPanelProps) {
  const [open, setOpen] = React.useState(false);
  const activeCount = Object.values(values).filter(
    (v) => v !== undefined && v !== "" && v !== "all"
  ).length;

  const setField = (id: string, value: string) => {
    onChange({ ...values, [id]: value === "all" ? "" : value });
  };

  const handleReset = () => {
    const cleared = Object.fromEntries(fields.map((f) => [f.id, ""]));
    onChange(cleared);
    onReset?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-1.5 px-2.5 text-xs sm:h-8",
            activeCount > 0 && "border-stroke",
            className
          )}
          aria-expanded={open}
        >
          <Filter className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>{title}</span>
          {activeCount > 0 ? (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
              {activeCount}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "h-3 w-3 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(100vw-2rem,20rem)] space-y-2.5 p-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground">{title}</p>
          {activeCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          {fields.map((field) => {
            const type = field.type ?? "select";
            const current = values[field.id] ?? "";

            return (
              <div key={field.id} className="space-y-1">
                <Label
                  htmlFor={`filter-${field.id}`}
                  className="text-[10px] text-muted-foreground"
                >
                  {field.label}
                </Label>

                {type === "date" ? (
                  <Input
                    id={`filter-${field.id}`}
                    type="date"
                    value={current}
                    onChange={(e) => setField(field.id, e.target.value)}
                    className="h-8 text-xs"
                  />
                ) : type === "text" ? (
                  <Input
                    id={`filter-${field.id}`}
                    type="text"
                    value={current}
                    onChange={(e) => setField(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    className="h-8 text-xs"
                  />
                ) : (
                  <Select
                    value={current || "all"}
                    onValueChange={(v) => setField(field.id, v)}
                  >
                    <SelectTrigger
                      id={`filter-${field.id}`}
                      className="h-8 text-xs"
                    >
                      <SelectValue
                        placeholder={field.placeholder ?? `All ${field.label}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {field.placeholder ?? `All ${field.label}`}
                      </SelectItem>
                      {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
