"use client";

import * as React from "react";
import { Camera, ScanBarcode, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface BarcodeScannerProps {
  onScan: (code: string) => void | Promise<void>;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
}

export function BarcodeScanner({
  onScan,
  placeholder = "Scan or type barcode / SKU",
  label = "Barcode scanner",
  autoFocus = true,
  className,
  disabled,
}: BarcodeScannerProps) {
  const [value, setValue] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const submit = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || pending) return;
    setPending(true);
    try {
      await onScan(trimmed);
      setValue("");
      inputRef.current?.focus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scan failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="barcode-scanner" className="flex items-center gap-2">
        <ScanBarcode className="h-4 w-4 text-pharmacy-600" />
        {label}
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            id="barcode-scanner"
            value={value}
            disabled={disabled || pending}
            autoFocus={autoFocus}
            placeholder={placeholder}
            className="pr-10 font-mono"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit(value);
              }
            }}
          />
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <Button
          type="button"
          onClick={() => void submit(value)}
          disabled={disabled || pending || !value.trim()}
        >
          Lookup
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled
          title="Camera scanning coming soon — use a USB barcode scanner with the input focused"
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          Camera
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        USB scanners work by typing into this focused field and sending Enter.
        Camera capture is a placeholder for future support.
      </p>
    </div>
  );
}
