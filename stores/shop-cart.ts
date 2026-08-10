"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ShopCartItem = {
  productId: string;
  name: string;
  price: number;
  unitLabel: string;
  quantity: number;
  requiresPrescription: boolean;
  imageUrl?: string | null;
  slug?: string;
};

type ShopCartState = {
  items: ShopCartItem[];
  addItem: (item: Omit<ShopCartItem, "quantity">, qty?: number) => void;
  updateQty: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

export const useShopCart = create<ShopCartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, qty = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + qty }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: qty }] };
        });
      },
      updateQty: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        }));
      },
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: "bilal-shop-cart" }
  )
);
