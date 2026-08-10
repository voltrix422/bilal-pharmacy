"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SearchBarProps {
  value?: string;
  defaultValue?: string;
  /** Called immediately on each keystroke */
  onChange?: (value: string) => void;
  /** Called after debounce (and on Enter / clear) */
  onSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  autoFocus?: boolean;
}

export function SearchBar({
  value: controlledValue,
  defaultValue = "",
  onChange,
  onSearch,
  placeholder = "Search...",
  className,
  debounceMs = 300,
  autoFocus = false,
}: SearchBarProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internal;
  const onSearchRef = React.useRef(onSearch);
  onSearchRef.current = onSearch;

  React.useEffect(() => {
    if (!onSearchRef.current) return;
    const timer = setTimeout(() => onSearchRef.current?.(value), debounceMs);
    return () => clearTimeout(timer);
  }, [value, debounceMs]);

  const update = (next: string) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  return (
    <div className={cn("relative w-full min-w-0 max-w-full sm:max-w-sm", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => update(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch?.(value);
        }}
        placeholder={placeholder}
        className="h-9 pl-8 pr-9 text-sm sm:h-8 sm:text-xs"
        autoFocus={autoFocus}
        aria-label={placeholder}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2 sm:h-6 sm:w-6"
          onClick={() => {
            update("");
            onSearch?.("");
          }}
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </Button>
      ) : null}
    </div>
  );
}
