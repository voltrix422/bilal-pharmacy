"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/order";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        portal: "customer",
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password.");
        toast.error("Invalid email or password.");
        return;
      }
      toast.success("Welcome back");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "mt-1.5 h-11 w-full rounded-lg border border-[#d8e5dc] bg-[#f7faf8] px-3 text-sm text-[#1a2e22] outline-none transition placeholder:text-[#9aab9f] focus:border-[#1d9851] focus:bg-white focus:ring-2 focus:ring-[#1d9851]/15";

  return (
    <div className="mx-auto w-full max-w-md">
      <Link
        href="/order"
        className="inline-flex items-center gap-1 text-xs font-medium text-[#5a6f62] transition hover:text-[#1d9851]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to shop
      </Link>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#d8e5dc] bg-white shadow-[0_8px_30px_rgba(26,46,34,0.06)]">
        <div className="border-b border-[#e4eee7] bg-[#f7faf8] px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Image
              src="/bilal-pharmacy-mark.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1d9851]">
                Bilal Pharmacy
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-[#1a2e22]">
                Sign in
              </h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#5a6f62]">
            Use your account to add medicines and place orders.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-6 sm:px-8 sm:py-7">
          <label className="block">
            <span className="text-xs font-medium text-[#3d5246]">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-[#3d5246]">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className={fieldClass}
            />
          </label>
          {error ? (
            <p className="rounded-lg bg-[#fef2f1] px-3 py-2 text-xs text-[#d4322a]">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#1d9851] text-sm font-semibold text-white transition hover:bg-[#178544] disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <div className="border-t border-[#e4eee7] bg-[#f7faf8] px-6 py-4 text-center text-sm text-[#5a6f62] sm:px-8">
          New here?{" "}
          <Link
            href={`/order/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-semibold text-[#1d9851] hover:underline"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-[#1d9851]" />
        </div>
      }
    >
      <CustomerLoginForm />
    </Suspense>
  );
}
