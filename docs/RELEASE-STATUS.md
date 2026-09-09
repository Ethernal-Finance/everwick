# Release status — September 7, 2026

This build remains a development build, not a completed AAA or market-ready release. All proof-of-concept systems have been retained: the million-tile world, licensed Fantasy Dreamland art, shared multiplayer presence, visiting and decorating homes, farming, fishing, crafting, player markets, local businesses, wages and rent, civic economics, construction, jobs, delivery stories, family genetics, persistent memories, LM Studio dialogue and Stripe fulfillment.

The citizenship redesign is implemented: account registration adds no life; a paid citizenship controls one existing adult; player possessions and NPC possessions share one resident; AFK/disconnect returns control to autonomous simulation; generated personalities affect daily choices; new worlds start with 25 founders; growth is birth-only toward a 500-life cap. The existing save was backed up and migrated without deleting residents or changing total town cash.

Validation: 64 automated tests pass, covering citizenship claims, payment entitlement gating, persistence, duplicate requests, AFK movement, birth-only growth, population capacity, money and item conservation, existing activities, house permissions, multiplayer visibility, dialogue memory and local-model failures. Browser verification confirmed the inherited resident profile and redesigned citizenship screen. These checks do not establish 500 simultaneous player capacity or AAA production quality.

Unfinished release work remains substantial:

- Cohesive art direction across the full map, animation transitions, sound and music, accessibility and responsive input polish.
- Longer playtests and balance at growing populations, varied family stories and recurring content; validating that economic choices remain enjoyable over time.
- Sustained concurrent-player and model-load testing, disconnect/reconnect edge cases, operational monitoring, backup restoration drills and security review.
- Payment inventory/reservation handling when the last available residents are claimed, and complete customer-facing support, refund and privacy flows.
- Production HTTPS domain, server/runtime deployment, real Stripe test checkout/webhook verification and publication of contact details. Local configuration preflight currently fails on APP_ORIGIN, DOMAIN, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and PUBLIC_CONTACT_EMAIL.

No live payment, public deployment or certification of launch readiness has been performed. The configured LM Studio runtime remains on the local workstation; deploying the web server elsewhere also requires reachable model hosting.

## September 7 experience and economic accounts update

The landing page now has a woodland journal design, a live arched town view, a town screenshot feature, and matching game interface styling. Resident selection adds search and a character review before committing citizenship. These changes are implemented but have not had a full browser accessibility or device review.

The Economy panel now reports adult employment correctly, household cash flows, wage arrears, treasury funds, household spending, commodity turnover and measured stock coverage. It distinguishes turnover from GDP and shows an explicitly estimated household essentials budget. Citizen/account aliases are excluded from internal household transfers. Basket-price changes compare distinct completed days. Reports are read-only and based on the bounded existing transaction ledger; a busy town exceeding its ledger retention needs durable aggregate accounting before scale-up.

Evening encounters now require physical proximity. Generous neighbours can transfer their own food to hungry residents, creating reciprocal memories and a Gazette event. No currency or food is created by these encounters.

Validation for this update: 71 automated tests, including employment denominators, transaction windows, citizen aliases, price comparisons, thirty-day economic reports, authenticated HTTP report delivery, encounter proximity and conserved food gifts. The deployment build validates module syntax and packages source. Automated checks are not browser QA, load testing or commercial launch certification.

Launch configuration remains incomplete: HTTPS origin, domain, Stripe secret and webhook configuration, and public support contact. The Node HTTP server and local SQLite store cannot run unchanged on Sites' Cloudflare Workers runtime. A compatible Node deployment or a separate persistence/runtime migration is required. No public deployment or live sale was performed.
