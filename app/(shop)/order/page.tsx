"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { ShopAuthPrompt } from "@/components/marketing/ShopAuthPrompt";
import { useShopCart } from "@/stores/shop-cart";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type WebsiteProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  price: number;
  unitLabel: string;
  requiresPrescription: boolean;
  imageUrl: string | null;
};

async function fetchProducts(q: string) {
  const params = new URLSearchParams({ public: "true" });
  if (q) params.set("q", q);
  const res = await fetch(`/api/website/products?${params}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || "Failed to load");
  return (body.data ?? []) as WebsiteProduct[];
}

export default function OrderPortalPage() {
  const { data: session } = useSession();
  const isCustomer = session?.user?.role === "CUSTOMER";
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("All");
  const [authOpen, setAuthOpen] = useState(false);
  const addItem = useShopCart((s) => s.addItem);
  const items = useShopCart((s) => s.items);
  const updateQty = useShopCart((s) => s.updateQty);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["website-products-public", debounced],
    queryFn: () => fetchProducts(debounced),
  });

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  const filtered =
    category === "All"
      ? products
      : products.filter((p) => p.category === category);

  const cartQty = (id: string) =>
    items.find((i) => i.productId === id)?.quantity ?? 0;

  function requireAccount(action: () => void) {
    if (!isCustomer) {
      setAuthOpen(true);
      return;
    }
    action();
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-[#1a2e22] sm:text-2xl">
        Medicines
      </h1>
      <p className="mt-1 text-sm text-[#5a6f62]">
        Browse the catalog. Sign in only when you are ready to order.
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search medicines…"
        className="mt-4 h-10 w-full border-0 border-b border-[#c5d9cc] bg-transparent px-0 text-sm outline-none transition focus:border-[#1d9851] sm:mt-5 sm:max-w-md"
      />

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-xs font-medium transition",
              category === c
                ? "bg-[#1d9851] text-white"
                : "bg-[#e8f5ee] text-[#3d5246] hover:bg-[#d7ebdf]"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <p className="col-span-full py-8 text-sm text-[#5a6f62]">
            Loading products…
          </p>
        ) : filtered.length === 0 ? (
          <p className="col-span-full py-8 text-sm text-[#5a6f62]">
            No products found.
          </p>
        ) : (
          filtered.map((p) => {
            const qty = cartQty(p.id);
            return (
              <article
                key={p.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-[#d8e5dc] bg-white shadow-[0_1px_0_rgba(26,46,34,0.04)] transition hover:border-[#1d9851]/40 hover:shadow-md"
              >
                <Link
                  href={`/order/product/${p.slug}`}
                  className="relative aspect-[4/3] bg-[#eef5f0]"
                >
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt={p.name}
                      fill
                      className="object-cover"
                      sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, (max-width:1280px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[#6b8073]">
                      No photo
                    </div>
                  )}
                  {p.requiresPrescription ? (
                    <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-[#1d9851] shadow-sm">
                      Rx
                    </span>
                  ) : null}
                </Link>

                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[#6b8073] sm:text-[11px]">
                    {p.category} · {p.unitLabel}
                  </p>
                  <Link
                    href={`/order/product/${p.slug}`}
                    className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-[#1a2e22] hover:text-[#1d9851] sm:text-[15px]"
                  >
                    {p.name}
                  </Link>
                  {p.description ? (
                    <p className="mt-1.5 hidden line-clamp-2 text-xs leading-relaxed text-[#5a6f62] sm:block">
                      {p.description}
                    </p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 sm:pt-4">
                    <p className="text-sm font-semibold tabular-nums text-[#1d9851] sm:text-base">
                      {formatCurrency(p.price)}
                    </p>
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          requireAccount(() => {
                            addItem({
                              productId: p.id,
                              name: p.name,
                              price: p.price,
                              unitLabel: p.unitLabel,
                              requiresPrescription: p.requiresPrescription,
                              imageUrl: p.imageUrl,
                              slug: p.slug,
                            });
                            toast.success("Added to cart");
                          })
                        }
                        className="h-9 rounded-md bg-[#1d9851] px-3.5 text-xs font-semibold text-white transition hover:bg-[#178544]"
                      >
                        Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-[#c5d9cc]"
                          onClick={() => updateQty(p.id, qty - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">
                          {qty}
                        </span>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-[#c5d9cc]"
                          onClick={() => updateQty(p.id, qty + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <ShopAuthPrompt
        open={authOpen}
        onOpenChange={setAuthOpen}
        callbackUrl="/order"
      />
    </div>
  );
}
