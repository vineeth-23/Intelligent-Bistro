import "dotenv/config";
import cors from "cors";
import express from "express";
import { MENU_ITEMS } from "@intelligent-bistro/shared";
import { createOrderRequestSchema, orderIntentRequestSchema } from "./schemas";
import { parseOrderIntent } from "./openaiIntent";
import { createOrder, listOrders } from "./orders";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({ ok: true, service: "intelligent-bistro-api" });
});

app.get("/menu", (_request, response) => {
  response.json({ items: MENU_ITEMS });
});

app.post("/ai/order-intent", async (request, response) => {
  const parsed = orderIntentRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: "Invalid request",
      issues: parsed.error.flatten()
    });
    return;
  }

  const intent = await parseOrderIntent(
    parsed.data.message,
    parsed.data.cart,
    parsed.data.pendingClarification
  );
  response.json(intent);
});

app.post("/orders", (request, response) => {
  const parsed = createOrderRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: "Invalid order",
      issues: parsed.error.flatten()
    });
    return;
  }

  response.status(201).json({ order: createOrder(parsed.data) });
});

app.get("/orders", (_request, response) => {
  response.json({ orders: listOrders() });
});

app.listen(port, () => {
  console.log(`Intelligent Bistro API listening on http://localhost:${port}`);
});
