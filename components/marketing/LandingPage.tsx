"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, HeartPulse, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { WhatsAppFloat } from "@/components/marketing/WhatsAppFloat";
import { FreeDeliveryPopup } from "@/components/marketing/FreeDeliveryPopup";

const SERVICES = [
  {
    title: "Prescription desk",
    text: "Checked dispensing for every script that comes through the counter.",
    icon: HeartPulse,
  },
  {
    title: "Order online",
    text: "Browse packs with photos, then create an account when you are ready to buy.",
    icon: ShieldCheck,
  },
  {
    title: "Steady hours",
    text: "Clear timings, refill support, and care for the neighbourhood.",
    icon: Clock3,
  },
] as const;

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f7faf8] text-[#1a2e22]">
      <SiteHeader transparent />

      <section className="relative min-h-[100svh] overflow-hidden">
        <Image
          src="/landing-hero-pharmacy.jpg"
          alt="Bilal Pharmacy interior"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#0d1f16]/75" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1f16]/92 via-[#123024]/55 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-4 pb-20 pt-24 sm:px-8 sm:pb-24 sm:pt-28">
          <p
            className="animate-blue-rise mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[#9fd4b3] sm:mb-3 sm:text-xs sm:tracking-[0.24em]"
            style={{ animationDelay: "60ms" }}
          >
            Pharmacy &amp; Health Care
          </p>
          <h1
            className="animate-blue-rise max-w-2xl text-[2.35rem] font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl"
            style={{ animationDelay: "140ms" }}
          >
            Bilal Pharmacy
          </h1>
          <p
            className="animate-blue-rise mt-4 max-w-md text-sm leading-relaxed text-white/85 sm:mt-5 sm:text-lg"
            style={{ animationDelay: "280ms" }}
          >
            Quiet precision for everyday medicine — browse online, order in
            minutes, and collect when ready.
          </p>
          <div
            className="animate-blue-rise mt-6 flex w-full flex-col gap-2.5 sm:mt-8 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-3"
            style={{ animationDelay: "420ms" }}
          >
            <Link
              href="/order"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#1d9851] px-5 text-sm font-semibold text-white transition hover:bg-[#178544] sm:w-auto"
            >
              Order medicines
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/order/register"
              className="inline-flex h-11 w-full items-center justify-center rounded-md border border-white/35 px-5 text-sm font-medium text-white transition hover:bg-white/10 sm:w-auto"
            >
              Sign up
            </Link>
          </div>
        </div>
      </section>

      <section id="care" className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-20">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d9851]">
            Care
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#1a2e22] sm:text-4xl">
            Medicine made straightforward
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#5a6f62] sm:text-base">
            Bilal Pharmacy keeps things calm: clear stock, checked prescriptions,
            and an easy online shop for everyday medicine.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4">
          {SERVICES.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="animate-blue-rise rounded-2xl border border-[#d8e5dc] bg-white p-5"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <Icon className="mb-3 h-5 w-5 text-[#1d9851]" strokeWidth={1.5} />
                <h3 className="text-base font-semibold text-[#1a2e22]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5a6f62]">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-[#d8e5dc] bg-white">
        <div className="mx-auto grid max-w-6xl items-end gap-8 px-4 py-12 sm:grid-cols-2 sm:gap-10 sm:px-8 sm:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d9851]">
              How ordering works
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#1a2e22] sm:text-3xl">
              Four short steps
            </h2>
            <ol className="mt-6 space-y-4">
              {[
                "Browse medicines with photos — no account needed.",
                "Create an account when you want to add to cart.",
                "Confirm your details and place the order.",
                "Track status in your account until it is ready.",
              ].map((step, i) => (
                <li key={step} className="flex gap-3 text-sm text-[#3d5246]">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8f5ee] text-xs font-semibold text-[#1d9851]">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl bg-[#123024] px-6 py-8 text-white sm:px-8">
            <p className="text-xs uppercase tracking-[0.18em] text-[#9fd4b3]">
              Online desk
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              Need a refill or OTC pack?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Browse freely, then create an account to checkout. Prescription
              items may need verification at pickup.
            </p>
            <Link
              href="/order"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-[#1d9851] px-5 text-sm font-semibold text-white hover:bg-[#178544]"
            >
              Browse shop
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
      <WhatsAppFloat />
      <FreeDeliveryPopup />
    </div>
  );
}
