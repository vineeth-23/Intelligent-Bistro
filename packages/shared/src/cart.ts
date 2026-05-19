import { getMenuItem } from "./menu";
import type { CartAction, CartItem, CartState, MenuItem } from "./types";

const TAX_RATE = 0.08875;
const SERVICE_RATE = 0.03;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const normalizeModifiers = (modifierIds: string[]) => [...new Set(modifierIds)].sort();

const lineIdFor = (
  menuItemId: string,
  variantId: string | null,
  modifierIds: string[],
  specialInstructions: string | null
) => {
  const cleanInstructions = (specialInstructions ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return [
    "line",
    menuItemId,
    variantId ?? "base",
    normalizeModifiers(modifierIds).join(".") || "plain",
    cleanInstructions || "standard"
  ].join(":");
};

export const calculateUnitPrice = (
  menuItem: MenuItem,
  variantId: string | null,
  modifierIds: string[]
) => {
  const variantDelta = menuItem.variants.find((variant) => variant.id === variantId)?.priceDelta ?? 0;
  const modifierDelta = normalizeModifiers(modifierIds).reduce((total, modifierId) => {
    return total + (menuItem.modifiers.find((modifier) => modifier.id === modifierId)?.priceDelta ?? 0);
  }, 0);

  return roundMoney(menuItem.basePrice + variantDelta + modifierDelta);
};

export const calculateTotals = (items: CartItem[]) => {
  const subtotal = roundMoney(items.reduce((total, item) => total + item.unitPrice * item.quantity, 0));
  const tax = roundMoney(subtotal * TAX_RATE);
  const service = roundMoney(subtotal * SERVICE_RATE);

  return {
    subtotal,
    tax,
    service,
    total: roundMoney(subtotal + tax + service)
  };
};

export const createEmptyCart = (): CartState => ({
  items: [],
  totals: calculateTotals([])
});

const matchCartIndex = (items: CartItem[], cartItemId: string | null, menuItemId: string | null) => {
  if (cartItemId) {
    const byCartId = items.findIndex((item) => item.id === cartItemId);
    if (byCartId >= 0) return byCartId;
  }

  if (menuItemId) {
    return items.findIndex((item) => item.menuItemId === menuItemId);
  }

  return -1;
};

const withTotals = (items: CartItem[]): CartState => ({
  items: items.filter((item) => item.quantity > 0),
  totals: calculateTotals(items.filter((item) => item.quantity > 0))
});

export const applyCartAction = (
  cart: CartState,
  action: CartAction,
  menu: MenuItem[] = []
): CartState => {
  if (action.type === "NO_OP") return cart;
  if (action.type === "CLEAR_CART") return createEmptyCart();

  if (action.type === "ADD_ITEM") {
    const menuItem = getMenuItem(action.menuItemId, menu);
    if (!menuItem) return cart;

    const modifierIds = normalizeModifiers(action.modifierIds);
    const quantity = Math.max(1, Math.floor(action.quantity));
    const specialInstructions = action.specialInstructions?.trim() || null;
    const unitPrice = calculateUnitPrice(menuItem, action.variantId, modifierIds);
    const id = lineIdFor(menuItem.id, action.variantId, modifierIds, specialInstructions);
    const existing = cart.items.find((item) => item.id === id);

    if (existing) {
      return withTotals(
        cart.items.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + quantity } : item
        )
      );
    }

    return withTotals([
      ...cart.items,
      {
        id,
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity,
        variantId: action.variantId,
        modifierIds,
        specialInstructions,
        unitPrice
      }
    ]);
  }

  if (action.type === "REMOVE_ITEM") {
    const index = matchCartIndex(cart.items, action.cartItemId, action.menuItemId);
    if (index < 0) return cart;
    const quantityToRemove = action.quantity ?? cart.items[index].quantity;

    return withTotals(
      cart.items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, quantity: Math.max(0, item.quantity - quantityToRemove) }
          : item
      )
    );
  }

  if (action.type === "UPDATE_QUANTITY") {
    const index = matchCartIndex(cart.items, action.cartItemId, action.menuItemId);
    if (index < 0) return cart;

    return withTotals(
      cart.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, quantity: Math.max(0, Math.floor(action.quantity)) } : item
      )
    );
  }

  if (action.type === "UPDATE_MODIFIERS") {
    const index = matchCartIndex(cart.items, action.cartItemId, action.menuItemId);
    if (index < 0) return cart;
    const current = cart.items[index];
    const menuItem = getMenuItem(current.menuItemId, menu);
    if (!menuItem) return cart;

    const modifierIds = normalizeModifiers(action.modifierIds);
    const specialInstructions = action.specialInstructions?.trim() || null;
    const unitPrice = calculateUnitPrice(menuItem, action.variantId, modifierIds);
    const id = lineIdFor(menuItem.id, action.variantId, modifierIds, specialInstructions);

    return withTotals(
      cart.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              id,
              variantId: action.variantId,
              modifierIds,
              specialInstructions,
              unitPrice
            }
          : item
      )
    );
  }

  return cart;
};

export const applyCartActions = (
  cart: CartState,
  actions: CartAction[],
  menu: MenuItem[] = []
) => actions.reduce((currentCart, action) => applyCartAction(currentCart, action, menu), cart);
