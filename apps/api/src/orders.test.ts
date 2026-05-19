import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { OrderRequest } from "@intelligent-bistro/shared";
import { createOrder, clearOrdersForTest, listOrders } from "./orders";
import { createOrderRequestSchema } from "./schemas";

const validRequest: OrderRequest = {
  guestName: "Sahana",
  pickupWindow: "ASAP",
  orderNotes: "Sauce on the side",
  cart: {
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
  }
};

describe("orders", () => {
  beforeEach(() => {
    clearOrdersForTest();
  });

  it("creates and stores received orders", () => {
    const order = createOrder(validRequest);

    assert.match(order.id, /^IB-/);
    assert.equal(order.status, "received");
    assert.equal(order.guestName, "Sahana");
    assert.equal(order.estimatedReadyAt.endsWith("Z"), true);
    assert.equal(listOrders().length, 1);
    assert.equal(listOrders()[0].id, order.id);
  });

  it("accepts scheduled pickup labels as estimated ready time", () => {
    const order = createOrder({
      ...validRequest,
      pickupWindow: "6:45 PM"
    });

    assert.equal(order.estimatedReadyAt, "6:45 PM");
  });

  it("rejects empty carts before order creation", () => {
    const parsed = createOrderRequestSchema.safeParse({
      ...validRequest,
      cart: {
        items: [],
        totals: {
          subtotal: 0,
          tax: 0,
          service: 0,
          total: 0
        }
      }
    });

    assert.equal(parsed.success, false);
  });
});
