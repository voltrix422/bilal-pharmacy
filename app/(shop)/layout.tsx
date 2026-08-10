import type { ReactNode } from "react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { WhatsAppFloat } from "@/components/marketing/WhatsAppFloat";
import { FreeDeliveryPopup } from "@/components/marketing/FreeDeliveryPopup";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7faf8] text-[#1a2e22]">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-8 sm:py-10 sm:pb-10">
        {children}
      </main>
      <SiteFooter />
      <WhatsAppFloat />
      <FreeDeliveryPopup />
    </div>
  );
}
