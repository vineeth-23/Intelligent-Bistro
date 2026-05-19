import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CartState } from "@intelligent-bistro/shared";
import { fallbackParseIntent } from "./fallbackParser";

const emptyTotals = {
  subtotal: 0,
  tax: 0,
  service: 0,
  total: 0
};

const chickenCartWithTwoLines: CartState = {
  totals: emptyTotals,
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
    },
    {
      id: "line:spicy_chicken_sandwich:classic:no_aioli:standard",
      menuItemId: "spicy_chicken_sandwich",
      name: "Spicy Chicken Sandwich",
      quantity: 1,
      variantId: "classic",
      modifierIds: ["no_aioli"],
      specialInstructions: null,
      unitPrice: 14.5
    }
  ]
};

describe("fallback order intent parser", () => {
  it("parses multi-item add requests into structured actions", () => {
    const response = fallbackParseIntent("Add two spicy chicken sandwiches and a large water", {
      items: [],
      totals: emptyTotals
    });

    assert.equal(response.clarificationQuestion, null);
    assert.equal(response.actions.length, 2);
    assert.deepEqual(response.actions[0], {
      type: "ADD_ITEM",
      menuItemId: "spicy_chicken_sandwich",
      quantity: 2,
      variantId: "classic",
      modifierIds: [],
      specialInstructions: null
    });
    assert.deepEqual(response.actions[1], {
      type: "ADD_ITEM",
      menuItemId: "large_water",
      quantity: 1,
      variantId: "large",
      modifierIds: [],
      specialInstructions: null
    });
  });

  it("updates a single matching cart line instead of adding a duplicate", () => {
    const response = fallbackParseIntent("Make my fries extra crispy", {
      totals: emptyTotals,
      items: [
        {
          id: "line:harissa_fries:regular:plain:standard",
          menuItemId: "harissa_fries",
          name: "Harissa Fries",
          quantity: 1,
          variantId: "regular",
          modifierIds: [],
          specialInstructions: null,
          unitPrice: 7.5
        }
      ]
    });

    assert.equal(response.actions.length, 1);
    assert.deepEqual(response.actions[0], {
      type: "UPDATE_MODIFIERS",
      cartItemId: "line:harissa_fries:regular:plain:standard",
      menuItemId: "harissa_fries",
      variantId: "regular",
      modifierIds: ["extra_crispy"],
      specialInstructions: null
    });
  });

  it("asks for clarification when multiple matching lines could be updated", () => {
    const response = fallbackParseIntent(
      "Make the chicken sandwich extra spicy",
      chickenCartWithTwoLines
    );

    assert.equal(response.actions.length, 0);
    assert.equal(response.clarificationQuestion, "Which cart line should I update?");
  });

  it("resolves a clarification answer against the original request", () => {
    const response = fallbackParseIntent("the second one", chickenCartWithTwoLines, {
      originalMessage: "Make the chicken sandwich extra spicy",
      question: "Which cart line should I update?"
    });

    assert.equal(response.clarificationQuestion, null);
    assert.deepEqual(response.actions[0], {
      type: "UPDATE_MODIFIERS",
      cartItemId: "line:spicy_chicken_sandwich:classic:no_aioli:standard",
      menuItemId: "spicy_chicken_sandwich",
      variantId: "extra_spicy",
      modifierIds: ["no_aioli"],
      specialInstructions: null
    });
  });
});
