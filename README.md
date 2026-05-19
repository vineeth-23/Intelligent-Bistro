# Intelligent Bistro

Intelligent Bistro is a high-fidelity Expo React Native ordering app with a Node/Express backend. Guests can browse a bistro menu, customize items, manage a cart manually, and ask an AI assistant to update the cart through natural language.

The project was built for the challenge statement in [task.text](task.text): a polished mobile ordering experience where an AI assistant interprets restaurant-ordering intents and returns structured cart actions.

## Demo Videos

- [App demo](https://www.loom.com/share/404f9f53791445cb822dc0a4af42c0b1)
- [Codebase demo](https://www.loom.com/share/9d660ed87f624417b3df90785b46d585)

## What It Does

- Browse a polished restaurant menu with item images, categories, variants, modifiers, and prices.
- Customize items manually with quantity, style, modifiers, and kitchen notes.
- Manage cart lines with quantity controls, edit, remove, taxes, service, and totals.
- Ask the AI assistant to add, remove, or modify cart items.
- Resolve ambiguous assistant requests through a follow-up clarification loop.
- Review checkout details, choose pickup time, add guest details, and place an order.
- Persist placed orders in the Node backend with `POST /orders` and list them with `GET /orders`.

## Architecture

```text
Intelligent-Bistro/
  apps/
    api/       Node + Express backend
    mobile/    Expo React Native app
  packages/
    shared/    Menu, cart, order, and assistant action types
```

### Mobile

- Expo Router
- React Native
- Zustand cart store
- Shared cart reducer from `@intelligent-bistro/shared`
- Conversational assistant UI connected to the backend

### Backend

- Express API
- OpenAI Responses API integration
- Strict JSON-schema response format for assistant actions
- Zod request validation
- Semantic action validation so invented menu IDs, modifiers, variants, and cart targets are rejected
- Deterministic fallback parser when `OPENAI_API_KEY` is not configured
- In-memory order persistence for demo checkout

## AI Flow

The mobile app sends the user message and current cart to:

```text
POST /ai/order-intent
```

The backend returns structured actions:

```json
{
  "assistantMessage": "Added those items to your cart.",
  "confidence": 0.72,
  "clarificationQuestion": null,
  "actions": [
    {
      "type": "ADD_ITEM",
      "menuItemId": "spicy_chicken_sandwich",
      "quantity": 2,
      "variantId": "classic",
      "modifierIds": [],
      "specialInstructions": null
    }
  ]
}
```

The app applies those actions through the same cart reducer used by manual UI controls.

Supported action types:

- `ADD_ITEM`
- `REMOVE_ITEM`
- `UPDATE_QUANTITY`
- `UPDATE_MODIFIERS`
- `CLEAR_CART`
- `NO_OP`

## Setup

```bash
npm install
cp .env.example .env
```

Add your local OpenAI key to `.env`:

```bash
OPENAI_API_KEY=your_rotated_key_here
OPENAI_MODEL=gpt-5.4-mini
PORT=4000
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
```

Do not commit `.env`.

For a physical phone, set `EXPO_PUBLIC_API_BASE_URL` to your computer's LAN address, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:4000
```

## Run

Start the API:

```bash
npm run dev:api
```

Start Expo:

```bash
npm run dev:mobile
```

Open the app:

- Expo Go: scan the QR code from the terminal.
- Browser preview: [http://localhost:8081](http://localhost:8081)

The API runs at [http://localhost:4000](http://localhost:4000).

## Demo Script

1. Open the menu.
2. Customize a Spicy Chicken Sandwich.
3. Add `Extra spicy` and `Extra pickles`.
4. Go to the cart and edit the item.
5. Ask the assistant: `Add two spicy chicken sandwiches and a large water`.
6. Ask: `Make the chicken sandwich no aioli`.
7. If clarification appears, answer: `the second one`.
8. Review checkout.
9. Choose a pickup time.
10. Place the order and note the generated order ID.
11. Check persisted orders:

```bash
curl -s http://localhost:4000/orders
```

## Useful Prompts

```text
Add two spicy chicken sandwiches and a large water
Make my fries extra crispy
No aioli on the chicken sandwich
Remove the water
Clear my cart
Make the second chicken sandwich extra spicy
```

## API Endpoints

```text
GET  /health
GET  /menu
POST /ai/order-intent
POST /orders
GET  /orders
```

Example order creation:

```bash
curl -s -X POST http://localhost:4000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "guestName": "Sahana",
    "pickupWindow": "ASAP",
    "orderNotes": "Sauce on side",
    "cart": {
      "items": [
        {
          "id": "line:spicy_chicken_sandwich:classic:plain:standard",
          "menuItemId": "spicy_chicken_sandwich",
          "name": "Spicy Chicken Sandwich",
          "quantity": 1,
          "variantId": "classic",
          "modifierIds": [],
          "specialInstructions": null,
          "unitPrice": 14.5
        }
      ],
      "totals": {
        "subtotal": 14.5,
        "tax": 1.29,
        "service": 0.44,
        "total": 16.23
      }
    }
  }'
```

## Verify

```bash
npm run typecheck
npm test
curl -s http://localhost:4000/health
curl -s -X POST http://localhost:4000/ai/order-intent \
  -H "Content-Type: application/json" \
  -d '{"message":"Add two spicy chicken sandwiches and a large water","cart":{"items":[]}}'
```

Current test coverage includes:

- Shared cart reducer behavior
- Cart merging and distinct customization lines
- Backend fallback parser behavior
- Ambiguous AI clarification flow
- Semantic action validation
- Order creation and empty-cart rejection

## Notes

- The fallback parser keeps the demo usable without an OpenAI key.
- The OpenAI path uses strict structured output plus server-side semantic validation.
- Orders are stored in memory for demo purposes; restarting the API clears them.
