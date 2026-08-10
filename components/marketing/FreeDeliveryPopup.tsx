"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "bilal-delivery-popup-seen";

export function FreeDeliveryPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // ignore
    }
    const t = window.setTimeout(() => setOpen(true), 500);
    return () => window.clearTimeout(t);
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0d1f16]/55 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-popup-title"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-[#123024] text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="relative flex flex-col items-center gap-5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8 sm:py-6">
          <div className="pointer-events-none absolute -left-10 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-[#1d9851]/30 blur-2xl" />
          <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-[#1d9851]/20 blur-2xl" />

          <div className="relative flex min-w-0 flex-1 items-center gap-4 text-center sm:text-left">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 sm:flex">
              <Image
                src="/bilal-pharmacy-mark.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9fd4b3]">
                On every order
              </p>
              <h2
                id="delivery-popup-title"
                className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                Free Delivery
              </h2>
              <p className="mt-1 text-sm text-white/70">
                B-17 &amp; nearby — Multi Gardens included.
              </p>
            </div>
          </div>

          <div className="relative flex w-full shrink-0 items-center justify-center gap-2 sm:w-auto">
            <Link
              href="/order"
              onClick={dismiss}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-[#1d9851] px-5 text-sm font-semibold text-white transition hover:bg-[#178544] sm:flex-none"
            >
              Order now
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex h-10 items-center justify-center rounded-md border border-white/25 px-4 text-sm font-medium text-white/85 transition hover:bg-white/10"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
