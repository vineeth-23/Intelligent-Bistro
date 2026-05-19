import { MENU_ITEMS, getMenuItem } from "@intelligent-bistro/shared";
import type { AssistantIntentResponse, CartAction, CartItem, CartState, MenuItem } from "@intelligent-bistro/shared";

const hasVariant = (item: MenuItem, variantId: string | null) =>
  variantId === null || item.variants.some((variant) => variant.id === variantId);

const validModifierIds = (item: MenuItem, modifierIds: string[]) => {
  const validIds = new Set(item.modifiers.map((modifier) => modifier.id));
  return modifierIds.every((modifierId) => validIds.has(modifierId));
};

const findTargetLine = (
  action: { cartItemId: string | null; menuItemId: string | null },
  cart?: CartState
): CartItem | null => {
  if (!cart) return null;

  if (action.cartItemId) {
    const byCartId = cart.items.find((item) => item.id === action.cartItemId);
    if (byCartId) return byCartId;
  }

  if (action.menuItemId) {
    const matches = cart.items.filter((item) => item.menuItemId === action.menuItemId);
    if (matches.length === 1) return matches[0];
  }

  return null;
};

const isValidAction = (action: CartAction, cart?: CartState) => {
  if (action.type === "CLEAR_CART" || action.type === "NO_OP") return true;

  if (action.type === "ADD_ITEM") {
    const item = getMenuItem(action.menuItemId, MENU_ITEMS);
    if (!item) return false;
    return hasVariant(item, action.variantId) && validModifierIds(item, action.modifierIds);
  }

  if (action.type === "REMOVE_ITEM" || action.type === "UPDATE_QUANTITY") {
    return findTargetLine(action, cart) !== null;
  }

  if (action.type === "UPDATE_MODIFIERS") {
    const target = findTargetLine(action, cart);
    if (!target) return false;
    const item = getMenuItem(target.menuItemId, MENU_ITEMS);
    if (!item) return false;
    return hasVariant(item, action.variantId) && validModifierIds(item, action.modifierIds);
  }

  return false;
};

export const validateIntentResponse = (
  response: AssistantIntentResponse,
  cart?: CartState
): AssistantIntentResponse => {
  const validActions = response.actions.filter((action) => isValidAction(action, cart));

  if (validActions.length > 0 || response.actions.length === 0) {
    return {
      ...response,
      actions: validActions
    };
  }

  return {
    assistantMessage: "I could not safely match that request to the menu or your cart.",
    confidence: Math.min(response.confidence, 0.4),
    clarificationQuestion: "Can you rephrase with the exact item or customization?",
    actions: []
  };
};
