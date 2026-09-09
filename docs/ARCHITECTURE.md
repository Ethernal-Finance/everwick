# Everwick architecture

Status: local vertical slice; release candidate criteria are in LAUNCH.md. The initial Sites scaffolder attempt could not run in this environment (EPERM resolving the Windows home directory). No public deployment is claimed.

## Boundaries
- `client/`: public launch site and canvas game. Browser sends intentions, never balances or inventory mutations.
- `server/simulation.mjs`: deterministic economic kernel; integer coins, physical inventories, production recipes, wages, consumption, rent, insolvency, relationships and event-derived news.
- `server/db.mjs`: SQLite WAL persistence, atomic transactions, snapshot and normalized identity/payment/analytics/task tables.
- `server/auth.mjs`: scrypt passwords, expiring opaque cookie sessions, same-origin writes, admin roles.
- `server/payments.mjs`: Stripe Checkout REST and HMAC-verified webhook settlement, idempotent purchase/entitlement processing.
- `server/ai.mjs`: bounded context retrieval, persistent tasks, deterministic and OpenAI-compatible providers. Routine simulation never calls a model.
- `server/index.mjs`: HTTP routing, validation, worker loop, rate limiting, analytics and API boundaries.

## Persistence and authority
One process owns a town. A simulation tick and snapshot write execute in one SQLite transaction. Commands execute synchronously in the same process; no distributed locks are claimed. On restart elapsed ticks are replayed in bounded batches; last processed time advances only with a committed tick. Transactions are double-entry transfers recorded in the town ledger. Production and consumption have explicit item changes. No money is minted after seeding except a player's documented starter grant, which transfers funds from the finite town treasury.

One tick is one town hour (15 real seconds by default); wages, rent and business accounting run once per 24 ticks. Local playback continues while the Node process runs. Stopped-server time is caught up on restart. Deploy one persistent process with a durable volume; do not run multiple instances against the same database. The public site and game currently share a server, with separate client routes and server modules.

## First milestone acceptance
Register, enter town, inspect a citizen, converse/tip, purchase an available business using starter coins, change prices/wages, leave, return, inspect the event-derived return briefing and newspaper. Admin privileges require a local CLI action. Simulate multiple days and assert cash conservation, nonnegative stocks, rent/wage transfer integrity, purchase replay protection and persistent restart behavior.

## Planned scale boundary
Extract town workers behind a command queue with per-town sequence numbers. Partition by town, not individual NPC; use Postgres for accounts/payments and a town snapshot/event store. AI queue interface accepts dialogue, reasoning, summaries, economic planning, news and story jobs. A Globernetes adapter must implement leased tasks, authenticated results, timeouts and idempotent settlement; there is no documented Globernetes endpoint supplied, so none is invented.
