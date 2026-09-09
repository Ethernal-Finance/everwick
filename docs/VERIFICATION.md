# Verification record

Local development verification, September 2026:

- 23 automated tests passed with Node 24, including 30 simulated days.
- Cash/material conservation, nonnegative inventories, wages/rent, bankruptcy, authorization, command replay, persistence/rollback and offline replay passed.
- Map entrances, sub-tick NPC movement, speed bounds and workplace arrival passed.
- Player buy/sell and property ownership/rent controls passed.
- Password/session/CSRF/admin, waitlist and unavailable-checkout HTTP flows passed.
- Stripe HMAC, replay, identity/amount/mode mismatch, failure ordering, partial/full refunds and entitlement handling passed using local signed fixtures.
- Local memory dialogue and interrupted-task recovery passed.
- Source syntax/build validation completed with `node scripts/build.mjs`.
- Native Canvas renders of the game renderer were visually inspected. Two atlas crops were corrected to remove adjacent-building strips. These were map-render checks, not an end-to-end browser UI test.
- The local game page and `/api/me`/`/api/health` responded after restarting away from obsolete wallet queries.
- Source scan found no embedded Stripe secret credentials. No live key was stored or used.

Not verified: real Stripe Checkout/webhook/receipt delivery, an external model provider, public deployment, end-to-end browser/accessibility interaction tests, distributed load, long-term retention, optional WebMCP registration in a supporting browser, founder cosmetic delivery and account recovery.

Blockchain tests were removed with the blockchain feature at the user's request. The active application has no wallet endpoints.
