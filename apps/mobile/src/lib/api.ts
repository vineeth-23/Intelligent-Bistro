import type { AssistantIntentResponse, CartState, Order, OrderRequest } from "@intelligent-bistro/shared";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type PendingClarification = {
  originalMessage: string;
  question: string;
};

export const submitAssistantMessage = async (
  message: string,
  cart: CartState,
  pendingClarification?: PendingClarification | null
): Promise<AssistantIntentResponse & { source?: "openai" | "fallback" }> => {
  const response = await fetch(`${API_BASE_URL}/ai/order-intent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message, cart, pendingClarification: pendingClarification ?? null })
  });

  if (!response.ok) {
    throw new Error(`Assistant request failed with status ${response.status}`);
  }

  return response.json();
};

export const submitOrder = async (orderRequest: OrderRequest): Promise<Order> => {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(orderRequest)
  });

  if (!response.ok) {
    throw new Error(`Order request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { order: Order };
  return payload.order;
};
