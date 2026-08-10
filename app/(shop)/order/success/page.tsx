"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessBody() {
  const params = useSearchParams();
  const no = params.get("no");

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d9851]">
        Order received
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-[#1a2e22]">
        Thank you
      </h1>
      {no ? (
        <p className="mt-2 text-sm text-[#5a6f62]">
          Reference: <span className="font-semibold text-[#1d9851]">{no}</span>
        </p>
      ) : null}
      <p className="mt-3 text-sm text-[#5a6f62]">
        Our team will confirm your order by phone shortly.
      </p>
      <Link
        href="/order"
        className="mt-6 inline-flex h-10 items-center rounded-md bg-[#1d9851] px-4 text-sm font-semibold text-white"
      >
        Order more
      </Link>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense>
      <SuccessBody />
    </Suspense>
  );
}
