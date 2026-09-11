# Commercial model and planning costs

## Pricing recommendation

Keep the current local alpha free. Treat the founder tiers as a capped support campaign: **$25 Citizen, $75 Town, $199 City, $499 Patron**. Do not sell scarce economic advantages that undermine the town. Cosmetic decorations, titles, character slots and credits can recognize support without promising financial returns. Do not open paid founder sales until concrete delivery/refund terms and operational checks are complete.

For later testing, price the base game/early access at **$19.99**, optional cosmetic sets at **$3–8**, and a **$6/month** membership for cosmetic allowance and noncompetitive convenience. These are pricing experiments, not evidence-backed forecasts. Test willingness to pay with interviews and real conversion cohorts. Private-world subscriptions and expansions should follow measured server costs and sustained engagement. Do not sell coin payouts or guaranteed business profits.

## Infrastructure planning envelope

Assumptions: users below are **monthly active users**, 20% DAU, 5% peak concurrency, roughly 100 players per town, CDN-cached static art, moderate polling/event traffic, durable databases and backups. Higher rows assume a redesigned partitioned backend; the current single-process build does **not** support those scales. Dollar figures are rough monthly budgeting allowances, not provider quotes or measured load-test results. They exclude payroll, customer support, payment fees, tax, marketing and model inference.

| Monthly active users | Assumed DAU / peak concurrent | Planned architecture | Infrastructure / month |
|---:|---:|---|---:|
| 100 | 20 / 5 | One small persistent Node host, volume, backups | $25–75 |
| 1,000 | 200 / 50 | Separate web/town workers, managed backups and monitoring | $100–350 |
| 10,000 | 2,000 / 500 | Partitioned towns, Postgres, queue, CDN and observability | $750–2,500 |
| 100,000 | 20,000 / 5,000 | Multiple worker pools, redundant data services and capacity reserve | $6,000–20,000 |

Reference point checked during development: Hetzner lists shared and dedicated VM prices that make a small local-world server inexpensive, but larger rows include redundancy, storage and operations rather than multiplying a single cheap VM. Availability varies by region and machine family. [Hetzner published price table](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/).

## AI inference scenarios

The default deterministic mode incurs **$0 external inference cost** at every scale; CPU/server cost remains. For a hosted model scenario, assume each daily active user triggers 8 calls/day, each averaging 700 input + 120 output tokens. Add 25% for retries, summaries and high-level decisions. Cost = MAU × 20% × 30 × 8 × 1.25 × [(700 × input rate + 120 × output rate) / 1,000,000]. Routine movement, shopping, production and payments use zero model calls.

Reference budget model: Groq's listed Llama 3.1 8B Instant rates of **$0.05/M input and $0.08/M output** imply $0.0000446 per assumed call. This is an illustrative cost floor; quality and rate limits must be evaluated. [Groq official model rates](https://console.groq.com/docs/models). No Groq integration credentials or real model runs were used.

| Monthly active users | Calls/month incl. 25% reserve | Small-model inference/month | Higher-quality planning case ($1/M input, $3/M output) |
|---:|---:|---:|---:|
| 100 | 6,000 | $0.27 | $6.36 |
| 1,000 | 60,000 | $2.68 | $63.60 |
| 10,000 | 600,000 | $26.76 | $636 |
| 100,000 | 6,000,000 | $267.60 | $6,360 |

The higher-quality column is a hypothetical rate scenario, not a quote for a particular model. If all MAU are daily users, multiply these AI costs by five. Longer dialogue histories, heavier reasoning and uncapped conversations can dominate these estimates. Local models avoid API bills but add hardware and administration; they are not free infrastructure.

The shipped default global daily call cap is 100. It must be redesigned into per-user/per-town limits and reserved budget quotas before large-scale rollout. Require max-output limits, timeouts, provider usage reporting, evaluation sets and a dollar-based daily shutdown in production.

## Founder campaign economics

At $25,000 gross, one illustrative package mix is 400 × $25 + 100 × $75 + 25 × $199 + 5 × $499 = **$24,970**. This is a planning scenario, not funding raised. Fees, tax, refunds and benefit-delivery costs reduce usable funds. The public progress bar uses only settled Stripe rows net of refunds and labels test purchases as test data.

This amount can fund a tightly scoped next milestone; it should not be presented as funding a complete persistent multiplayer company. Set a fixed scope, disclose remaining work and publish monthly gross/net/use-of-funds updates from real records.

### Claim supply cap (enforced at checkout and settlement)

Checkout now counts unclaimed, claimable Generation A residents in the live world and refuses a sale when the remaining supply cannot cover the requested package. The same check repeats at webhook settlement; an over-cap purchase is marked oversold for manual refund instead of granting entitlements that cannot be delivered. A fresh build seeds 25 Generation A founders; the Gen A 250 migration spreads 250 residents across cohorts (40 Everwick, 60 satellite, 80 traveling, 70 frontier) of which only the non-away cohorts are claimable, so the live ceiling is lower than 250 and changes as residents migrate.

The illustrative $25,000 package mix (~700 claim slots) exceeds every one of these ceilings, so the campaign must be rescaled to what the town can actually deliver before any paid launch. The Breeder pack is retired from sale: it priced a heritable breeding advantage, which the commercial rules in this document forbid selling. Existing Breeder purchases keep settling and refunding through the legacy path.
