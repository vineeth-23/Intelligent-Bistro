# Demo Walkthrough

Use this script when presenting Intelligent Bistro.

## 1. Start Services

```bash
npm run dev:api
npm run dev:mobile
```

Open Expo Go or [http://localhost:8081](http://localhost:8081).

## 2. Manual Ordering

1. Open the menu.
2. Tap `Customize` on Spicy Chicken Sandwich.
3. Choose `Extra spicy`.
4. Choose `Extra pickles`.
5. Add it to the cart.
6. Edit the cart line and change one customization.

Talking point: manual controls and AI actions share the same cart reducer.

## 3. AI Ordering

Try:

```text
Add two spicy chicken sandwiches and a large water
Make my fries extra crispy
No aioli on the chicken sandwich
Remove the water
```

Talking point: the backend returns validated structured JSON actions, not free-form cart mutations.

## 4. Clarification

Create two chicken sandwich lines with different modifiers, then ask:

```text
Make the chicken sandwich extra spicy
```

When the assistant asks which line, answer:

```text
the second one
```

Talking point: the assistant carries pending clarification context into the next request.

## 5. Checkout

1. Review checkout.
2. Choose pickup time.
3. Enter a guest name.
4. Place the order.
5. Show the generated order ID.

Then verify backend persistence:

```bash
curl -s http://localhost:4000/orders
```

## 6. Verification

```bash
npm run typecheck
npm test
```
