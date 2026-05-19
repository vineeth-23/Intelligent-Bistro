export type MenuCategory =
  | "chef-specials"
  | "sandwiches"
  | "bowls"
  | "sides"
  | "drinks"
  | "desserts";

export type ModifierOption = {
  id: string;
  label: string;
  priceDelta: number;
};

export type MenuVariant = {
  id: string;
  label: string;
  priceDelta: number;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  category: MenuCategory;
  basePrice: number;
  imageUrl: string;
  accentColor: string;
  tags: string[];
  spiceLevel: 0 | 1 | 2 | 3;
  variants: MenuVariant[];
  modifiers: ModifierOption[];
};

export type CartItem = {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  variantId: string | null;
  modifierIds: string[];
  specialInstructions: string | null;
  unitPrice: number;
};

export type CartTotals = {
  subtotal: number;
  tax: number;
  service: number;
  total: number;
};

export type CartState = {
  items: CartItem[];
  totals: CartTotals;
};

export type AddItemAction = {
  type: "ADD_ITEM";
  menuItemId: string;
  quantity: number;
  variantId: string | null;
  modifierIds: string[];
  specialInstructions: string | null;
};

export type RemoveItemAction = {
  type: "REMOVE_ITEM";
  cartItemId: string | null;
  menuItemId: string | null;
  quantity: number | null;
};

export type UpdateQuantityAction = {
  type: "UPDATE_QUANTITY";
  cartItemId: string | null;
  menuItemId: string | null;
  quantity: number;
};

export type UpdateModifiersAction = {
  type: "UPDATE_MODIFIERS";
  cartItemId: string | null;
  menuItemId: string | null;
  variantId: string | null;
  modifierIds: string[];
  specialInstructions: string | null;
};

export type ClearCartAction = {
  type: "CLEAR_CART";
};

export type NoOpAction = {
  type: "NO_OP";
  reason: string;
};

export type CartAction =
  | AddItemAction
  | RemoveItemAction
  | UpdateQuantityAction
  | UpdateModifiersAction
  | ClearCartAction
  | NoOpAction;

export type AssistantIntentResponse = {
  assistantMessage: string;
  confidence: number;
  clarificationQuestion: string | null;
  actions: CartAction[];
};

export type OrderStatus = "received" | "preparing" | "ready";

export type OrderRequest = {
  cart: CartState;
  guestName: string | null;
  pickupWindow: string;
  orderNotes: string | null;
};

export type Order = OrderRequest & {
  id: string;
  status: OrderStatus;
  createdAt: string;
  estimatedReadyAt: string;
};
