import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AssistantIntentResponse, CartState } from "@intelligent-bistro/shared";
import { validateIntentResponse } from "./intentValidation";

const cart: CartState = {
  totals: {
    subtotal: 14.5,
    tax: 1.29,
    service: 0.44,
    total: 16.23
  },
  items: [
    {
      id: "line:spicy_chicken_sandwich:classic:plain:standard",
      menuItemId: "spicy_chicken_sandwich",
      name: "Spicy Chicken Sandwich",
      quantity: 1,
      variantId: "classic",
      modifierIds: [],
      specialInstructions: null,
      unitPrice: 14.5
    }
  ]
};

const baseResponse = (actions: AssistantIntentResponse["actions"]): AssistantIntentResponse => ({
  assistantMessage: "Done.",
  confidence: 0.8,
  clarificationQuestion: null,
  actions
});

describe("intent response validation", () => {
  it("allows valid add-item actions", () => {
    const response = validateIntentResponse(
      baseResponse([
        {
          type: "ADD_ITEM",
          menuItemId: "large_water",
          quantity: 1,
          variantId: "large",
          modifierIds: ["lemon"],
          specialInstructions: null
        }
      ]),
      cart
    );

    assert.equal(response.actions.length, 1);
    assert.equal(response.clarificationQuestion, null);
  });

  it("rejects invented menu items and asks for clarification", () => {
    const response = validateIntentResponse(
      baseResponse([
        {
          type: "ADD_ITEM",
          menuItemId: "dragon_roll",
          quantity: 1,
          variantId: null,
          modifierIds: [],
          specialInstructions: null
        }
      ]),
      cart
    );

    assert.equal(response.actions.length, 0);
    assert.equal(response.clarificationQuestion, "Can you rephrase with the exact item or customization?");
  });

  it("rejects invalid variants and modifiers", () => {
    const response = validateIntentResponse(
      baseResponse([
        {
          type: "ADD_ITEM",
          menuItemId: "spicy_chicken_sandwich",
          quantity: 1,
          variantId: "family_size",
          modifierIds: ["gold_leaf"],
          specialInstructions: null
        }
      ]),
      cart
    );

    assert.equal(response.actions.length, 0);
    assert.equal(response.confidence, 0.4);
  });

  it("rejects updates that do not target an existing cart line", () => {
    const response = validateIntentResponse(
      baseResponse([
        {
          type: "UPDATE_MODIFIERS",
          cartItemId: "missing-line",
          menuItemId: null,
          variantId: "extra_spicy",
          modifierIds: [],
          specialInstructions: null
        }
      ]),
      cart
    );

    assert.equal(response.actions.length, 0);
    assert.equal(response.clarificationQuestion, "Can you rephrase with the exact item or customization?");
  });

  it("keeps valid actions when mixed with invalid actions", () => {
    const response = validateIntentResponse(
      baseResponse([
        {
          type: "ADD_ITEM",
          menuItemId: "large_water",
          quantity: 1,
          variantId: "large",
          modifierIds: [],
          specialInstructions: null
        },
        {
          type: "REMOVE_ITEM",
          cartItemId: "missing-line",
          menuItemId: null,
          quantity: null
        }
      ]),
      cart
    );

    assert.equal(response.actions.length, 1);
    assert.equal(response.actions[0].type, "ADD_ITEM");
  });
});
