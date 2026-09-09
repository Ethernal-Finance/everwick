# Integration testing

## Stripe

The live key shared in conversation was not written to the application or used. Leave Stripe empty until a test key is available. Revoke the exposed live key in the Stripe Dashboard.

1. Use a Stripe sandbox/test account. Create **test** one-time USD Prices only (never live Prices here): Founder $25, Breeder $49 (1♂+1♀ Gen A), Town $75, City $199, Patron $499. Packs track claim slots; `citizen` aliases `founder`. Do not enable adjustable quantities or discounts; webhook settlement expects exact pack amounts.
2. Copy `.env.example` to `.env`. Set `STRIPE_MODE=test`, `STRIPE_SECRET_KEY=sk_test_...` and `STRIPE_PRICE_FOUNDER` / `BREEDER` / `TOWN` / `CITY` / `PATRON` (CITIZEN may alias FOUNDER). Never paste keys into client code. Sales stay paused until intentionally enabled.
3. Run the Stripe CLI:

```sh
stripe listen --forward-to localhost:3100/api/stripe/webhook
```

4. Put that listener's `whsec_...` in `STRIPE_WEBHOOK_SECRET` and restart Everwick.
5. Register/sign in, choose a founder package on the launch site, and complete the hosted test Checkout. Use Stripe's documented test card 4242 4242 4242 4242, a future expiration and any valid test CVC/postal code.
6. Confirm a `paid` purchase, one active entitlement and a changed **test-mode** funding total in Admin. The redirect alone never activates entitlements.
7. Replay the same completion event. Totals and entitlement count must not increase.
8. Issue partial and full test refunds. Net funding decreases; a full refund deactivates that purchase's entitlement. Replay older completion events and ensure it stays refunded.
9. Verify cancelled, expired and asynchronous failed sessions. An unconfigured Checkout returns 503; it never returns a fake payment success.

Subscribe production endpoints to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, and `charge.refunded`. Invalid HMAC signatures are rejected; unknown settlement/refund ordering errors return 500 for retry. The local tests create signed fixture events to validate code, not to claim real Stripe delivery.

Receipts: Checkout sets `payment_intent_data[receipt_email]` to the registered email. Configure Stripe's customer receipt settings. Test environments do not prove real receipt-email delivery. Production launch needs a real receipt test and tax/refund/fulfillment review.

Production separation: use a separate database/deployment, live Price IDs, a fresh live secret, production webhook secret, HTTPS `APP_ORIGIN`, `NODE_ENV=production`, and `STRIPE_MODE=live`. Do not turn on live mode as part of development testing. Mode and amounts are checked at webhook settlement.

Sources: [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment), [Stripe test cards](https://docs.stripe.com/testing), [Stripe receipts](https://docs.stripe.com/receipts).

## AI

Default `AI_PROVIDER=deterministic` performs no external requests. It replies from the citizen profile, current routine, relationship and the five most relevant memories. This mode is deliberately labeled in the UI.

For a local OpenAI-compatible model server:

```ini
AI_PROVIDER=compatible
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=your-installed-model
AI_API_KEY=
AI_DAILY_CALL_LIMIT=100
```

Start your model server separately. The game does not silently download model weights. For a commercial compatible endpoint, use its HTTPS base URL and server-only API key. Configure the input/output USD-per-million values to measure cost. Restart Everwick, ask a citizen a question, and inspect AI tasks/usage in Admin. Disconnect the provider and verify that dialogue reports an error, records a failed task, and leaves the economic state untouched.

The queue persists task IDs, context, status, attempts, result and usage. Dialogue currently executes during the HTTP request, with a 20-second timeout and one in-flight request per player. Interrupted tasks become failed on restart. Routine NPC actions never use a model. Additional task kinds and the `execute(kind, context)` provider boundary are present; a leased distributed worker and real Globernetes adapter are future work. No full conversation history or asset files are sent to a model.

## Blockchain removed

At the user's direction, blockchain and wallet integration were removed to use the supplied Fantasy Dreamland assets under their license. There is no blockchain test flow, no wallet storage, no token and no crypto-related feature in Everwick.
