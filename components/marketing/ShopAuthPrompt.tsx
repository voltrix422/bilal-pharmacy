"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ShopAuthPromptProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callbackUrl?: string;
};

export function ShopAuthPrompt({
  open,
  onOpenChange,
  callbackUrl = "/order",
}: ShopAuthPromptProps) {
  const next = encodeURIComponent(callbackUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] gap-0 overflow-hidden border-[#d8e5dc] bg-white p-0 sm:rounded-2xl">
        <div className="border-b border-[#e4eee7] bg-[#f7faf8] px-6 py-5">
          <div className="flex items-center gap-2.5">
            <Image
              src="/bilal-pharmacy-mark.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
            <div>
              <p className="text-sm font-semibold text-[#1a2e22]">
                Bilal Pharmacy
              </p>
              <p className="text-[11px] text-[#5a6f62]">Account required</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-lg text-[#1a2e22]">
              Create an account to continue
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-[#5a6f62]">
              You can browse freely. To add items and place an order, create an
              account — or sign in if you already have one.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex flex-col gap-2.5">
            <Link
              href={`/order/register?callbackUrl=${next}`}
              className="inline-flex h-11 items-center justify-center rounded-md bg-[#1d9851] text-sm font-semibold text-white transition hover:bg-[#178544]"
              onClick={() => onOpenChange(false)}
            >
              Create account
            </Link>
            <Link
              href={`/order/login?callbackUrl=${next}`}
              className="inline-flex h-11 items-center justify-center rounded-md border border-[#c5d9cc] text-sm font-medium text-[#1a2e22] transition hover:border-[#1d9851] hover:text-[#1d9851]"
              onClick={() => onOpenChange(false)}
            >
              Sign in
            </Link>
            <button
              type="button"
              className="h-9 text-xs font-medium text-[#6b8073] transition hover:text-[#1d9851]"
              onClick={() => onOpenChange(false)}
            >
              Keep browsing
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
