import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MENU_ITEMS } from "./menu";
import { applyCartAction, applyCartActions, createEmptyCart } from "./cart";

describe("cart reducer", () => {
  it("adds matching custom lines together and recalculates totals", () => {
    const cart = applyCartActions(
      createEmptyCart(),
      [
        {
          type: "ADD_ITEM",
          menuItemId: "spicy_chicken_sandwich",
          quantity: 1,
          variantId: "extra_spicy",
          modifierIds: ["extra_pickles"],
          specialInstructions: null
        },
        {
          type: "ADD_ITEM",
          menuItemId: "spicy_chicken_sandwich",
          quantity: 2,
          variantId: "extra_spicy",
          modifierIds: ["extra_pickles"],
          specialInstructions: null
        }
      ],
      MENU_ITEMS
    );

    assert.equal(cart.items.length, 1);
    assert.equal(cart.items[0].quantity, 3);
    assert.equal(cart.items[0].unitPrice, 15.75);
    assert.equal(cart.totals.subtotal, 47.25);
    assert.equal(cart.totals.total, 52.86);
  });

  it("keeps distinct customizations as separate cart lines", () => {
    const cart = applyCartActions(
      createEmptyCart(),
      [
        {
          type: "ADD_ITEM",
          menuItemId: "spicy_chicken_sandwich",
          quantity: 1,
          variantId: "classic",
          modifierIds: [],
          specialInstructions: null
        },
        {
          type: "ADD_ITEM",
          menuItemId: "spicy_chicken_sandwich",
          quantity: 1,
          variantId: "classic",
          modifierIds: ["no_aioli"],
          specialInstructions: null
        }
      ],
      MENU_ITEMS
    );

    assert.equal(cart.items.length, 2);
    assert.deepEqual(
      cart.items.map((item) => item.modifierIds),
      [[], ["no_aioli"]]
    );
  });

  it("updates modifiers on an existing line and removes zero-quantity lines", () => {
    const added = applyCartAction(
      createEmptyCart(),
      {
        type: "ADD_ITEM",
        menuItemId: "harissa_fries",
        quantity: 1,
        variantId: "regular",
        modifierIds: [],
        specialInstructions: null
      },
      MENU_ITEMS
    );

    const updated = applyCartAction(
      added,
      {
        type: "UPDATE_MODIFIERS",
        cartItemId: added.items[0].id,
        menuItemId: "harissa_fries",
        variantId: "large",
        modifierIds: ["extra_crispy"],
        specialInstructions: "share with table"
      },
      MENU_ITEMS
    );

    assert.equal(updated.items[0].variantId, "large");
    assert.deepEqual(updated.items[0].modifierIds, ["extra_crispy"]);
    assert.equal(updated.items[0].specialInstructions, "share with table");
    assert.equal(updated.items[0].unitPrice, 9.75);

    const removed = applyCartAction(
      updated,
      {
        type: "UPDATE_QUANTITY",
        cartItemId: updated.items[0].id,
        menuItemId: null,
        quantity: 0
      },
      MENU_ITEMS
    );

    assert.equal(removed.items.length, 0);
    assert.equal(removed.totals.total, 0);
  });
});
