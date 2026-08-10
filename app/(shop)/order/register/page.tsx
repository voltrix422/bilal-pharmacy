"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/order";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    city: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/website/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || "Registration failed");
      }

      const login = await signIn("credentials", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        portal: "customer",
        redirect: false,
      });
      if (login?.error) {
        toast.success("Account created — please sign in");
        router.push(
          `/order/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
        );
        return;
      }

      toast.success("Account created");
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "mt-1 h-9 w-full rounded-md border border-[#d8e5dc] bg-[#f7faf8] px-2.5 text-sm text-[#1a2e22] outline-none transition placeholder:text-[#9aab9f] focus:border-[#1d9851] focus:bg-white focus:ring-1 focus:ring-[#1d9851]/20";

  return (
    <div className="mx-auto w-full max-w-xl">
      <Link
        href="/order"
        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5a6f62] hover:text-[#1d9851]"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to shop
      </Link>

      <div className="mt-2 overflow-hidden rounded-xl border border-[#d8e5dc] bg-white">
        <div className="flex items-center gap-2.5 border-b border-[#e4eee7] bg-[#f7faf8] px-4 py-3">
          <Image
            src="/bilal-pharmacy-mark.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-[#1a2e22]">
              Create account
            </h1>
            <p className="text-[11px] text-[#5a6f62]">
              Order medicines and track requests.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-2.5 px-4 py-3.5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-[11px] font-medium text-[#3d5246]">
                Full name
              </span>
              <input
                required
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Your full name"
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-medium text-[#3d5246]">
                Email
              </span>
              <input
                required
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@email.com"
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-medium text-[#3d5246]">
                Password
              </span>
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Min. 6 characters"
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-medium text-[#3d5246]">
                Phone
              </span>
              <input
                required
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+92 3XX XXXXXXX"
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-medium text-[#3d5246]">
                City
              </span>
              <input
                type="text"
                autoComplete="address-level2"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Islamabad"
                className={fieldClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-[11px] font-medium text-[#3d5246]">
                Address
              </span>
              <input
                required
                type="text"
                autoComplete="street-address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Street, house / plot"
                className={fieldClass}
              />
            </label>
          </div>

          {error ? (
            <p className="rounded-md bg-[#fef2f1] px-2.5 py-1.5 text-[11px] text-[#d4322a]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-[#1d9851] text-sm font-semibold text-white transition hover:bg-[#178544] disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Creating…
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <div className="border-t border-[#e4eee7] px-4 py-2.5 text-center text-[12px] text-[#5a6f62]">
          Already registered?{" "}
          <Link
            href={`/order/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-semibold text-[#1d9851] hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-[#1d9851]" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
