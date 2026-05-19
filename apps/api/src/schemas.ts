import { z } from "zod";

const addItemActionSchema = z.object({
  type: z.literal("ADD_ITEM"),
  menuItemId: z.string(),
  quantity: z.number().int().min(1).max(20),
  variantId: z.string().nullable(),
  modifierIds: z.array(z.string()),
  specialInstructions: z.string().nullable()
});

const removeItemActionSchema = z.object({
  type: z.literal("REMOVE_ITEM"),
  cartItemId: z.string().nullable(),
  menuItemId: z.string().nullable(),
  quantity: z.number().int().min(1).max(20).nullable()
});

const updateQuantityActionSchema = z.object({
  type: z.literal("UPDATE_QUANTITY"),
  cartItemId: z.string().nullable(),
  menuItemId: z.string().nullable(),
  quantity: z.number().int().min(0).max(20)
});

const updateModifiersActionSchema = z.object({
  type: z.literal("UPDATE_MODIFIERS"),
  cartItemId: z.string().nullable(),
  menuItemId: z.string().nullable(),
  variantId: z.string().nullable(),
  modifierIds: z.array(z.string()),
  specialInstructions: z.string().nullable()
});

const clearCartActionSchema = z.object({
  type: z.literal("CLEAR_CART")
});

const noOpActionSchema = z.object({
  type: z.literal("NO_OP"),
  reason: z.string()
});

export const cartActionSchema = z.discriminatedUnion("type", [
  addItemActionSchema,
  removeItemActionSchema,
  updateQuantityActionSchema,
  updateModifiersActionSchema,
  clearCartActionSchema,
  noOpActionSchema
]);

export const assistantIntentResponseSchema = z.object({
  assistantMessage: z.string(),
  confidence: z.number().min(0).max(1),
  clarificationQuestion: z.string().nullable(),
  actions: z.array(cartActionSchema)
});

export const cartItemSchema = z.object({
  id: z.string(),
  menuItemId: z.string(),
  name: z.string(),
  quantity: z.number().int().min(1).max(20),
  variantId: z.string().nullable(),
  modifierIds: z.array(z.string()),
  specialInstructions: z.string().nullable(),
  unitPrice: z.number().nonnegative()
});

export const cartStateSchema = z.object({
  items: z.array(cartItemSchema).default([]),
  totals: z
    .object({
      subtotal: z.number().nonnegative(),
      tax: z.number().nonnegative(),
      service: z.number().nonnegative(),
      total: z.number().nonnegative()
    })
    .default({
      subtotal: 0,
      tax: 0,
      service: 0,
      total: 0
    })
});

export const createOrderRequestSchema = z.object({
  cart: cartStateSchema.refine((cart) => cart.items.length > 0, {
    message: "Cart must contain at least one item.",
    path: ["items"]
  }),
  guestName: z.string().trim().min(1).max(80).nullable(),
  pickupWindow: z.string().trim().min(1).max(40),
  orderNotes: z.string().trim().max(500).nullable()
});

export const pendingClarificationSchema = z.object({
  originalMessage: z.string().min(1).max(800),
  question: z.string().min(1).max(800)
});

export const orderIntentRequestSchema = z.object({
  message: z.string().min(1).max(800),
  cart: cartStateSchema.optional(),
  pendingClarification: pendingClarificationSchema.nullable().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string()
      })
    )
    .optional()
});

export const assistantIntentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["assistantMessage", "confidence", "clarificationQuestion", "actions"],
  properties: {
    assistantMessage: {
      type: "string",
      description: "Short, friendly confirmation or clarification for the guest."
    },
    confidence: {
      type: "number",
      description: "Model confidence from 0 to 1."
    },
    clarificationQuestion: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "A question to ask when the order intent is ambiguous, otherwise null."
    },
    actions: {
      type: "array",
      items: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: [
              "type",
              "menuItemId",
              "quantity",
              "variantId",
              "modifierIds",
              "specialInstructions"
            ],
            properties: {
              type: { type: "string", enum: ["ADD_ITEM"] },
              menuItemId: { type: "string" },
              quantity: { type: "integer" },
              variantId: { anyOf: [{ type: "string" }, { type: "null" }] },
              modifierIds: { type: "array", items: { type: "string" } },
              specialInstructions: { anyOf: [{ type: "string" }, { type: "null" }] }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "cartItemId", "menuItemId", "quantity"],
            properties: {
              type: { type: "string", enum: ["REMOVE_ITEM"] },
              cartItemId: { anyOf: [{ type: "string" }, { type: "null" }] },
              menuItemId: { anyOf: [{ type: "string" }, { type: "null" }] },
              quantity: { anyOf: [{ type: "integer" }, { type: "null" }] }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "cartItemId", "menuItemId", "quantity"],
            properties: {
              type: { type: "string", enum: ["UPDATE_QUANTITY"] },
              cartItemId: { anyOf: [{ type: "string" }, { type: "null" }] },
              menuItemId: { anyOf: [{ type: "string" }, { type: "null" }] },
              quantity: { type: "integer" }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: [
              "type",
              "cartItemId",
              "menuItemId",
              "variantId",
              "modifierIds",
              "specialInstructions"
            ],
            properties: {
              type: { type: "string", enum: ["UPDATE_MODIFIERS"] },
              cartItemId: { anyOf: [{ type: "string" }, { type: "null" }] },
              menuItemId: { anyOf: [{ type: "string" }, { type: "null" }] },
              variantId: { anyOf: [{ type: "string" }, { type: "null" }] },
              modifierIds: { type: "array", items: { type: "string" } },
              specialInstructions: { anyOf: [{ type: "string" }, { type: "null" }] }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type"],
            properties: {
              type: { type: "string", enum: ["CLEAR_CART"] }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "reason"],
            properties: {
              type: { type: "string", enum: ["NO_OP"] },
              reason: { type: "string" }
            }
          }
        ]
      }
    }
  }
} as const;
