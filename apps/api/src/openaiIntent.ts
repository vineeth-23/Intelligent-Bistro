import OpenAI from "openai";
import { MENU_ITEMS } from "@intelligent-bistro/shared";
import type { AssistantIntentResponse, CartState } from "@intelligent-bistro/shared";
import { assistantIntentJsonSchema, assistantIntentResponseSchema } from "./schemas";
import { fallbackParseIntent } from "./fallbackParser";
import { validateIntentResponse } from "./intentValidation";

type PendingClarification = {
  originalMessage: string;
  question: string;
};

const model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

const compactMenu = MENU_ITEMS.map((item) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  price: item.basePrice,
  variants: item.variants.map((variant) => ({
    id: variant.id,
    label: variant.label,
    priceDelta: variant.priceDelta
  })),
  modifiers: item.modifiers.map((modifier) => ({
    id: modifier.id,
    label: modifier.label,
    priceDelta: modifier.priceDelta
  })),
  tags: item.tags,
  spiceLevel: item.spiceLevel
}));

const systemPrompt = `You are the order-intent brain for Intelligent Bistro.
Return only structured JSON that matches the schema.
Use menuItemId, variantId, and modifierIds exactly as provided in the menu.
When adding an item, include all required fields and use quantity >= 1.
When the guest asks to customize, change, make, hold, add/remove a topping, or alter an item already in the cart, return UPDATE_MODIFIERS instead of ADD_ITEM.
For UPDATE_MODIFIERS, preserve the cart line's existing variantId, modifierIds, and specialInstructions unless the guest explicitly changes them.
When removing or updating an item, prefer cartItemId if the current cart has a clear matching line; otherwise use menuItemId.
If more than one cart line could match an update, ask a clarification question and return no cart-changing actions.
If pendingClarification is present, treat guestMessage as the answer to that question and apply the originalMessage to the clarified cart line.
If the request is ambiguous, ask one concise clarificationQuestion and return no cart-changing actions.
Do not invent menu items, variants, modifiers, prices, or unavailable customizations.
Map "no", "without", "hold", or "remove" an ingredient to the matching no_* modifier when one exists, such as no_aioli.
Interpret "large water" as menuItemId "large_water" with variantId "large" when possible.`;

export const parseOrderIntent = async (
  message: string,
  cart: CartState | undefined,
  pendingClarification?: PendingClarification | null
): Promise<AssistantIntentResponse & { source: "openai" | "fallback" }> => {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ...validateIntentResponse(fallbackParseIntent(message, cart, pendingClarification), cart),
      source: "fallback"
    };
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: JSON.stringify({
            guestMessage: message,
            pendingClarification: pendingClarification ?? null,
            currentCart: cart ?? { items: [] },
            menu: compactMenu
          })
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "assistant_order_intent",
          strict: true,
          schema: assistantIntentJsonSchema
        }
      }
    });

    const parsed = assistantIntentResponseSchema.parse(JSON.parse(response.output_text));
    return { ...validateIntentResponse(parsed, cart), source: "openai" };
  } catch (error) {
    console.error("OpenAI intent parsing failed, using fallback parser.", error);
    return {
      ...validateIntentResponse(fallbackParseIntent(message, cart, pendingClarification), cart),
      source: "fallback"
    };
  }
};
