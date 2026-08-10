"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { ShopAuthPrompt } from "@/components/marketing/ShopAuthPrompt";
import { useShopCart } from "@/stores/shop-cart";
import { formatCurrency } from "@/lib/utils/format";

type WebsiteProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  price: number;
  compareAtPrice: number | null;
  unitLabel: string;
  requiresPrescription: boolean;
  imageUrl: string | null;
};

async function fetchProduct(slug: string) {
  const res = await fetch(`/api/website/products/by-slug/${slug}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || "Not found");
  return body.data as WebsiteProduct;
}

export default function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const { data: session } = useSession();
  const isCustomer = session?.user?.role === "CUSTOMER";
  const [qty, setQty] = useState(1);
  const [authOpen, setAuthOpen] = useState(false);
  const addItem = useShopCart((s) => s.addItem);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["website-product", slug],
    queryFn: () => fetchProduct(slug),
  });

  if (isLoading) {
    return <p className="py-16 text-sm text-[#5a6b82]">Loading product…</p>;
  }

  if (error || !product) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-[#5a6b82]">Product not found.</p>
        <Link href="/order" className="mt-3 inline-block text-sm text-[#1d9851]">
          Back to catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/order"
        className="inline-flex items-center gap-1 text-xs font-medium text-[#5a6b82] hover:text-[#1d9851]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to products
      </Link>

      <div className="mt-4 grid gap-6 md:mt-6 md:grid-cols-[1.1fr_1fr] md:gap-8">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#eef5f0] sm:rounded-3xl">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width:768px) 100vw, 480px"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#6b8073]">
              No photo
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d9851]">
            {product.category}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1a2e22] sm:text-3xl">
            {product.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-xl font-semibold tabular-nums text-[#1d9851] sm:text-2xl">
              {formatCurrency(product.price)}
            </p>
            {product.compareAtPrice ? (
              <p className="text-sm text-[#6b8073] line-through">
                {formatCurrency(product.compareAtPrice)}
              </p>
            ) : null}
            <span className="rounded-full bg-[#eef5f0] px-2.5 py-0.5 text-[11px] text-[#3d5246]">
              per {product.unitLabel}
            </span>
            {product.requiresPrescription ? (
              <span className="rounded-full border border-[#1d9851]/30 px-2.5 py-0.5 text-[11px] font-medium text-[#1d9851]">
                Prescription required
              </span>
            ) : null}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-[#5a6f62] sm:mt-5">
            {product.description ||
              "Available for online order from Bilal Pharmacy. We will confirm availability when preparing your request."}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex w-fit items-center gap-1 rounded-full border border-[#c5d9cc] p-1">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#eef5f0]"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-semibold">{qty}</span>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#eef5f0]"
                onClick={() => setQty((q) => q + 1)}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!isCustomer) {
                  setAuthOpen(true);
                  return;
                }
                addItem(
                  {
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    unitLabel: product.unitLabel,
                    requiresPrescription: product.requiresPrescription,
                    imageUrl: product.imageUrl,
                    slug: product.slug,
                  },
                  qty
                );
                toast.success("Added to cart");
              }}
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#1d9851] px-6 text-sm font-semibold text-white hover:bg-[#178544] sm:w-auto"
            >
              Add to cart
            </button>
          </div>
        </div>
      </div>

      <ShopAuthPrompt
        open={authOpen}
        onOpenChange={setAuthOpen}
        callbackUrl={`/order/product/${product.slug}`}
      />
    </div>
  );
}
