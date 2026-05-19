import { MENU_ITEMS } from "@intelligent-bistro/shared";
import type {
  AssistantIntentResponse,
  CartAction,
  CartItem,
  CartState,
  MenuItem
} from "@intelligent-bistro/shared";

type PendingClarification = {
  originalMessage: string;
  question: string;
};

const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  a: 1,
  an: 1
};

const aliases: Record<string, string[]> = {
  spicy_chicken_sandwich: ["spicy chicken", "chicken sandwich", "spicy chicken sandwich"],
  truffle_mushroom_burger: ["burger", "mushroom burger", "truffle burger", "truffle mushroom burger"],
  saffron_salmon_bowl: ["salmon bowl", "salmon", "saffron salmon"],
  garden_risotto: ["risotto", "garden risotto", "vegan risotto"],
  harissa_fries: ["fries", "harissa fries"],
  large_water: ["water", "large water", "still water", "sparkling water"],
  citrus_spritz: ["spritz", "citrus spritz", "mocktail"],
  chocolate_budino: ["budino", "chocolate", "dessert", "chocolate budino"]
};

const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ");

const quantityNear = (message: string, alias: string) => {
  const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const before = new RegExp(`(?:^|\\s)(\\d+|${Object.keys(numberWords).join("|")})\\s+${escapedAlias}\\b`);
  const after = new RegExp(`\\b${escapedAlias}\\s+(\\d+)\\b`);
  const beforeMatch = message.match(before);
  if (beforeMatch) return Number(numberWords[beforeMatch[1]] ?? beforeMatch[1]);
  const afterMatch = message.match(after);
  if (afterMatch) return Number(afterMatch[1]);
  return 1;
};

const detectExplicitVariant = (message: string, item: MenuItem) => {
  const byLabel = item.variants.find((variant) => clean(message).includes(clean(variant.label)));
  if (byLabel) return byLabel.id;
  if (message.includes("large")) {
    const large = item.variants.find((variant) => variant.id === "large");
    if (large) return large.id;
  }
  if (message.includes("extra spicy")) {
    const extraSpicy = item.variants.find((variant) => variant.id === "extra_spicy");
    if (extraSpicy) return extraSpicy.id;
  }
  if (message.includes("double")) {
    const double = item.variants.find((variant) => variant.id.includes("double"));
    if (double) return double.id;
  }
  return null;
};

const detectModifiers = (message: string, item: MenuItem) =>
  item.modifiers
    .filter((modifier) => clean(message).includes(clean(modifier.label)))
    .map((modifier) => modifier.id);

const detectImplicitModifiers = (message: string, item: MenuItem) => {
  const modifierIds = new Set(detectModifiers(message, item));

  for (const modifier of item.modifiers) {
    const label = clean(modifier.label);
    if (label.startsWith("no ")) {
      const ingredient = label.replace(/^no\s+/, "");
      if (
        message.includes(`no ${ingredient}`) ||
        message.includes(`without ${ingredient}`) ||
        message.includes(`remove ${ingredient}`) ||
        message.includes(`hold ${ingredient}`)
      ) {
        modifierIds.add(modifier.id);
      }
    }

    if (label.startsWith("extra ")) {
      const ingredient = label.replace(/^extra\s+/, "");
      if (message.includes(`extra ${ingredient}`) || message.includes(`more ${ingredient}`)) {
        modifierIds.add(modifier.id);
      }
    }
  }

  return [...modifierIds];
};

const mentionedItems = (message: string) =>
  MENU_ITEMS.flatMap((item) => {
    const alias = aliases[item.id]?.find((candidate) => clean(message).includes(candidate));
    return alias ? [{ item, alias }] : [];
  });

const matchingCartLines = (cart: CartState | undefined, menuItemId: string): CartItem[] =>
  cart?.items.filter((item) => item.menuItemId === menuItemId) ?? [];

const shouldAddItem = (message: string) =>
  /\b(add|order|get|grab|want|need|give me|i'll have|ill have)\b/.test(message);

const isModifierIntent = (message: string, item: MenuItem) =>
  detectImplicitModifiers(message, item).length > 0 ||
  detectExplicitVariant(message, item) !== null ||
  /\b(make|change|update|modify|with|without|no|extra|hold|light)\b/.test(message);

const buildModifierUpdate = (
  message: string,
  item: MenuItem,
  cartLines: CartItem[]
): CartAction | null => {
  if (cartLines.length !== 1) return null;

  const current = cartLines[0];
  const detectedModifierIds = detectImplicitModifiers(message, item);
  const variantId = detectExplicitVariant(message, item) ?? current.variantId;
  const removeModifier = /\b(remove|take off|delete)\b/.test(message);

  const detectedNoStyleIds = detectedModifierIds.filter((modifierId) => modifierId.startsWith("no_"));
  const removableModifierIds = detectedModifierIds.filter((modifierId) => !modifierId.startsWith("no_"));
  const nextModifierIds = removeModifier
    ? [...new Set([
        ...current.modifierIds.filter((modifierId) => !removableModifierIds.includes(modifierId)),
        ...detectedNoStyleIds
      ])]
    : [...new Set([...current.modifierIds, ...detectedModifierIds])];

  return {
    type: "UPDATE_MODIFIERS",
    cartItemId: current.id,
    menuItemId: item.id,
    variantId,
    modifierIds: nextModifierIds,
    specialInstructions: current.specialInstructions
  };
};

const lineDescription = (line: CartItem, item: MenuItem) => {
  const variant = item.variants.find((candidate) => candidate.id === line.variantId)?.label ?? "";
  const modifiers = line.modifierIds
    .map((modifierId) => item.modifiers.find((modifier) => modifier.id === modifierId)?.label ?? "")
    .filter(Boolean);

  return clean([line.name, variant, ...modifiers, line.specialInstructions ?? ""].join(" "));
};

const resolveClarifiedLine = (
  answer: string,
  item: MenuItem,
  cartLines: CartItem[]
) => {
  if (cartLines.length === 0) return null;
  if (cartLines.length === 1) return cartLines[0];

  const normalizedAnswer = clean(answer);
  const ordinalMatch = normalizedAnswer.match(/\b(first|1st|one|second|2nd|two|third|3rd|three|last)\b/);
  if (ordinalMatch) {
    const token = ordinalMatch[1];
    if (["first", "1st", "one"].includes(token)) return cartLines[0];
    if (["second", "2nd", "two"].includes(token)) return cartLines[1] ?? null;
    if (["third", "3rd", "three"].includes(token)) return cartLines[2] ?? null;
    if (token === "last") return cartLines[cartLines.length - 1];
  }

  const scored = cartLines
    .map((line) => {
      const description = lineDescription(line, item);
      const score = normalizedAnswer
        .split(/\s+/)
        .filter((word) => word.length > 2 && description.includes(word)).length;
      return { line, score };
    })
    .sort((left, right) => right.score - left.score);

  return scored[0]?.score > 0 ? scored[0].line : null;
};

const resolvePendingClarification = (
  message: string,
  cart: CartState | undefined,
  pending: PendingClarification
): AssistantIntentResponse | null => {
  const original = clean(pending.originalMessage);
  const matches = mentionedItems(original);
  if (matches.length !== 1) return null;

  const [{ item }] = matches;
  const cartLines = matchingCartLines(cart, item.id);
  const clarifiedLine = resolveClarifiedLine(message, item, cartLines);

  if (!clarifiedLine) {
    return {
      assistantMessage: "I still need a bit more detail to pick the right cart line.",
      confidence: 0.38,
      clarificationQuestion: "Should I update the first, second, or another matching item?",
      actions: []
    };
  }

  const action = buildModifierUpdate(original, item, [clarifiedLine]);
  if (!action) return null;

  return {
    assistantMessage: "Got it. I updated the matching item.",
    confidence: 0.76,
    clarificationQuestion: null,
    actions: [action]
  };
};

export const fallbackParseIntent = (
  message: string,
  cart?: CartState,
  pendingClarification?: PendingClarification | null
): AssistantIntentResponse => {
  const normalized = clean(message);

  if (pendingClarification) {
    const resolved = resolvePendingClarification(message, cart, pendingClarification);
    if (resolved) return resolved;
  }

  if (/\b(clear|empty|reset)\b/.test(normalized) && normalized.includes("cart")) {
    return {
      assistantMessage: "I cleared your cart.",
      confidence: 0.9,
      clarificationQuestion: null,
      actions: [{ type: "CLEAR_CART" }]
    };
  }

  const matches = mentionedItems(normalized);
  if (matches.length === 0) {
    return {
      assistantMessage: "I can help with that, but I need one menu item to be more specific.",
      confidence: 0.35,
      clarificationQuestion: "Which menu item would you like me to update?",
      actions: []
    };
  }

  const isRemove = /\b(remove|delete|take off|cancel)\b/.test(normalized);
  const actions: CartAction[] = matches.map(({ item, alias }) => {
    const cartLines = matchingCartLines(cart, item.id);
    const modifierIntent = isModifierIntent(normalized, item);

    if (!shouldAddItem(normalized) && modifierIntent && cartLines.length > 1) {
      return {
        type: "NO_OP",
        reason: `Multiple ${item.name} lines are in the cart. Ask which one to update.`
      };
    }

    if (!shouldAddItem(normalized) && modifierIntent && cartLines.length === 1) {
      const modifierUpdate = buildModifierUpdate(normalized, item, cartLines);
      if (modifierUpdate) return modifierUpdate;
    }

    if (isRemove) {
      return {
        type: "REMOVE_ITEM",
        cartItemId: null,
        menuItemId: item.id,
        quantity: quantityNear(normalized, alias)
      };
    }

    return {
      type: "ADD_ITEM",
      menuItemId: item.id,
      quantity: quantityNear(normalized, alias),
      variantId: detectExplicitVariant(normalized, item) ?? item.variants[0]?.id ?? null,
      modifierIds: detectImplicitModifiers(normalized, item),
      specialInstructions: null
    };
  });

  const onlyNoOps = actions.length > 0 && actions.every((action) => action.type === "NO_OP");
  if (onlyNoOps) {
    return {
      assistantMessage: "I found more than one matching cart item.",
      confidence: 0.44,
      clarificationQuestion: "Which cart line should I update?",
      actions: []
    };
  }

  const didModify = actions.some((action) => action.type === "UPDATE_MODIFIERS");

  return {
    assistantMessage: didModify
      ? "Done. I updated those item details."
      : isRemove
      ? "Done. I updated the cart."
      : `Added ${matches.length === 1 ? matches[0].item.name : "those items"} to your cart.`,
    confidence: 0.72,
    clarificationQuestion: null,
    actions
  };
};
