import { create } from "zustand";
import {
  MENU_ITEMS,
  applyCartAction,
  applyCartActions,
  createEmptyCart
} from "@intelligent-bistro/shared";
import type { CartAction, CartState } from "@intelligent-bistro/shared";

type CartStore = {
  cart: CartState;
  lastAssistantSummary: string | null;
  applyAction: (action: CartAction) => void;
  applyActions: (actions: CartAction[], assistantMessage?: string) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartStore>((set) => ({
  cart: createEmptyCart(),
  lastAssistantSummary: null,
  applyAction: (action) =>
    set((state) => ({
      cart: applyCartAction(state.cart, action, MENU_ITEMS)
    })),
  applyActions: (actions, assistantMessage) =>
    set((state) => ({
      cart: applyCartActions(state.cart, actions, MENU_ITEMS),
      lastAssistantSummary: assistantMessage ?? state.lastAssistantSummary
    })),
  clearCart: () =>
    set({
      cart: createEmptyCart(),
      lastAssistantSummary: null
    })
}));
