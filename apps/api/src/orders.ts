import type { Order, OrderRequest } from "@intelligent-bistro/shared";

const orders: Order[] = [];

const estimateReadyAt = (createdAt: Date, pickupWindow: string) => {
  if (pickupWindow.toLowerCase() === "asap") {
    return new Date(createdAt.getTime() + 20 * 60 * 1000).toISOString();
  }

  return pickupWindow;
};

export const createOrder = (request: OrderRequest): Order => {
  const createdAt = new Date();
  const order: Order = {
    ...request,
    id: `IB-${createdAt.getTime().toString(36).toUpperCase()}`,
    status: "received",
    createdAt: createdAt.toISOString(),
    estimatedReadyAt: estimateReadyAt(createdAt, request.pickupWindow)
  };

  orders.unshift(order);
  return order;
};

export const listOrders = () => orders;

export const clearOrdersForTest = () => {
  orders.splice(0, orders.length);
};
