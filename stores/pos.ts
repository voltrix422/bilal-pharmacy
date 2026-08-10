import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CustomerDTO } from "@/types";

export interface PosCartItem {
  medicineId: string;
  batchId?: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  requiresPrescription: boolean;
  isControlled: boolean;
  sku?: string;
  maxStock?: number;
}

export interface HeldSale {
  id: string;
  label: string;
  heldAt: string;
  items: PosCartItem[];
  customer: CustomerDTO | null;
  prescriptionId: string | null;
  orderDiscount: number;
  notes?: string;
}

interface PosState {
  items: PosCartItem[];
  customer: CustomerDTO | null;
  prescriptionId: string | null;
  orderDiscount: number;
  notes: string;
  heldSales: HeldSale[];

  addItem: (item: Omit<PosCartItem, "quantity" | "discount"> & {
    quantity?: number;
    discount?: number;
  }) => void;
  removeItem: (medicineId: string, batchId?: string | null) => void;
  updateQty: (medicineId: string, quantity: number, batchId?: string | null) => void;
  setDiscount: (medicineId: string, discount: number, batchId?: string | null) => void;
  setOrderDiscount: (discount: number) => void;
  setCustomer: (customer: CustomerDTO | null) => void;
  setPrescriptionId: (prescriptionId: string | null) => void;
  setNotes: (notes: string) => void;
  clear: () => void;
  hold: (label?: string) => string | null;
  resume: (heldId: string) => boolean;
  removeHeld: (heldId: string) => void;

  subtotal: () => number;
  itemCount: () => number;
  lineTotal: (item: PosCartItem) => number;
  grandTotal: () => number;
  requiresPrescription: () => boolean;
  hasControlled: () => boolean;
}

function itemKey(medicineId: string, batchId?: string | null) {
  return `${medicineId}:${batchId ?? "auto"}`;
}

function findItemIndex(
  items: PosCartItem[],
  medicineId: string,
  batchId?: string | null
) {
  const key = itemKey(medicineId, batchId);
  return items.findIndex(
    (i) => itemKey(i.medicineId, i.batchId) === key
  );
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      items: [],
      customer: null,
      prescriptionId: null,
      orderDiscount: 0,
      notes: "",
      heldSales: [],

      addItem: (incoming) => {
        const quantity = incoming.quantity ?? 1;
        const discount = incoming.discount ?? 0;

        set((state) => {
          const idx = findItemIndex(
            state.items,
            incoming.medicineId,
            incoming.batchId
          );

          if (idx >= 0) {
            const next = [...state.items];
            const existing = next[idx];
            const max = existing.maxStock ?? Infinity;
            next[idx] = {
              ...existing,
              quantity: Math.min(existing.quantity + quantity, max),
              unitPrice: incoming.unitPrice,
              name: incoming.name,
              requiresPrescription: incoming.requiresPrescription,
              isControlled: incoming.isControlled,
              maxStock: incoming.maxStock ?? existing.maxStock,
            };
            return { items: next };
          }

          return {
            items: [
              ...state.items,
              {
                medicineId: incoming.medicineId,
                batchId: incoming.batchId ?? null,
                name: incoming.name,
                quantity,
                unitPrice: incoming.unitPrice,
                discount,
                requiresPrescription: incoming.requiresPrescription,
                isControlled: incoming.isControlled,
                sku: incoming.sku,
                maxStock: incoming.maxStock,
              },
            ],
          };
        });
      },

      removeItem: (medicineId, batchId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => itemKey(i.medicineId, i.batchId) !== itemKey(medicineId, batchId)
          ),
        }));
      },

      updateQty: (medicineId, quantity, batchId) => {
        if (quantity <= 0) {
          get().removeItem(medicineId, batchId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => {
            if (itemKey(i.medicineId, i.batchId) !== itemKey(medicineId, batchId)) {
              return i;
            }
            const max = i.maxStock ?? Infinity;
            return { ...i, quantity: Math.min(quantity, max) };
          }),
        }));
      },

      setDiscount: (medicineId, discount, batchId) => {
        set((state) => ({
          items: state.items.map((i) =>
            itemKey(i.medicineId, i.batchId) === itemKey(medicineId, batchId)
              ? { ...i, discount: Math.max(0, discount) }
              : i
          ),
        }));
      },

      setOrderDiscount: (discount) =>
        set({ orderDiscount: Math.max(0, discount) }),

      setCustomer: (customer) => set({ customer }),

      setPrescriptionId: (prescriptionId) => set({ prescriptionId }),

      setNotes: (notes) => set({ notes }),

      clear: () =>
        set({
          items: [],
          customer: null,
          prescriptionId: null,
          orderDiscount: 0,
          notes: "",
        }),

      hold: (label) => {
        const state = get();
        if (state.items.length === 0) return null;

        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `held-${Date.now()}`;

        const held: HeldSale = {
          id,
          label: label?.trim() || `Hold ${state.heldSales.length + 1}`,
          heldAt: new Date().toISOString(),
          items: state.items,
          customer: state.customer,
          prescriptionId: state.prescriptionId,
          orderDiscount: state.orderDiscount,
          notes: state.notes,
        };

        set({
          heldSales: [held, ...state.heldSales],
          items: [],
          customer: null,
          prescriptionId: null,
          orderDiscount: 0,
          notes: "",
        });

        return id;
      },

      resume: (heldId) => {
        const state = get();
        const held = state.heldSales.find((h) => h.id === heldId);
        if (!held) return false;

        set({
          items: held.items,
          customer: held.customer,
          prescriptionId: held.prescriptionId,
          orderDiscount: held.orderDiscount,
          notes: held.notes ?? "",
          heldSales: state.heldSales.filter((h) => h.id !== heldId),
        });
        return true;
      },

      removeHeld: (heldId) =>
        set((state) => ({
          heldSales: state.heldSales.filter((h) => h.id !== heldId),
        })),

      lineTotal: (item) =>
        Math.max(0, item.quantity * item.unitPrice - item.discount),

      subtotal: () => {
        const { items, lineTotal } = get();
        return items.reduce((sum, item) => sum + lineTotal(item), 0);
      },

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      grandTotal: () => {
        const { subtotal, orderDiscount } = get();
        return Math.max(0, subtotal() - orderDiscount);
      },

      requiresPrescription: () =>
        get().items.some((i) => i.requiresPrescription),

      hasControlled: () => get().items.some((i) => i.isControlled),
    }),
    {
      name: "bilal-pharmacy-pos",
      partialize: (state) => ({
        items: state.items,
        customer: state.customer,
        prescriptionId: state.prescriptionId,
        orderDiscount: state.orderDiscount,
        notes: state.notes,
        heldSales: state.heldSales,
      }),
    }
  )
);
