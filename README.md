> **AI AGENTS & CONTRIBUTORS:** Read [`AGENTS.md`](./AGENTS.md) before modifying this repository. It contains required collaboration, commit, testing, deployment, and data-safety rules.

# Everwick

A persistent town life game and citizenship platform. Node 24+, no npm dependencies required.

The current build preserves the original gameplay systems and unifies players with existing residents. See [Citizenship](docs/CITIZENSHIP.md), [Local AI](docs/LOCAL-AI.md), and [Release status](docs/RELEASE-STATUS.md) for current behavior and remaining launch work.

## Run

From this directory:

```sh
npm start
```

Or use Node directly:

```sh
node --env-file-if-exists=.env server/index.mjs
```

Open http://localhost:3100/play for the game, http://localhost:3100/ for the launch website, and http://localhost:3100/admin for administration. On this Windows machine, Node is also available through `start.ps1`.

```powershell
./start.ps1
```

The database is created automatically in `data/everwick.sqlite`. No database server or account is required. Copy `.env.example` to `.env` only when changing defaults. Never commit `.env`. Stripe is deliberately unconfigured; no live Stripe key has been saved.

## First play session

1. Create an account (email, name, password ≥12 characters) and claim an adult resident. Citizenship inherits their savings — there is **no** flat 4,500 starter grant (that path is legacy `addPlayer` only).
2. Press WASD/click to take control, then open **Story**. Complete the clinic delivery (**1,000 ◈** from the town treasury).
3. Buy a **starter home** (~**900 ◈**), place a little furniture, then buy the **Green Dragon Tavern** starter listing (**1,200 ◈**). Other businesses stay aspirational.
4. Adjust prices or wages on your business. Personal ◈ and business cash are separate. Deposits/withdrawals move 250; upgrades cost the business 1,000.
5. Walk with WASD/arrows, click-to-walk or the direction pad. Meet neighbours from Citizens. Leave and return after a few minutes for the return briefing and Gazette (one town day ≈ six real minutes by default).


## Frontier township expansion

The regional civilization layer now exists physically on the world map. Six frontier regions can be visited and developed. A new town requires an on site Town Hall, four construction shifts and a charter before housing or businesses can be commissioned. Each frontier has a biome landmark that boosts production of a specific local item. Housing creates migration capacity, while stores and workshops create jobs that compete for unclaimed residents.

See [Frontier Townships](docs/FRONTIER-TOWNSHIPS.md) for the full simulation rules.

## Procedural dungeons

Copperhill Catacombs is a player controlled activity near Copperhill Mine. Each entry generates a new maze with three rune seals, guardians, traps, caches and a locked exit. Autonomous citizens cannot run a dungeon. Failure has persistent costs, while successful clears return physical loot and a treasury funded bounty.

See [Dungeons](docs/DUNGEONS.md) for the full rules.

## Verify

```sh
npm test
npm run build
```

`node --test tests/*.test.mjs` works without npm. Tests use isolated SQLite databases and do not contact Stripe or a model provider. The build validates JavaScript syntax and packages deployable source in `dist/`; it is not a claim of a Cloudflare-compatible Worker build.

## Admin access

Register a normal account first, then run:

```sh
node --env-file-if-exists=.env scripts/admin.mjs your@email.com
```

Sign in at `/admin`. There is no default administrator password and no public role-assignment endpoint. `ADMIN_EMAIL` may supply the CLI argument; it does not automatically make registrations administrators.

## Integration guides

- `docs/INTEGRATIONS.md`: Stripe test Checkout/webhooks/refunds, AI models.
- `docs/ARCHITECTURE.md`: boundaries, authority, persistence and planned scaling.
- `docs/SIMULATION.md`: economic assumptions, memory and offline replay.
- `docs/OPERATIONS.md`: environment, migrations, backups, deployment and incident handling.
- `docs/LAUNCH.md`: launch readiness, next ten priorities and 90-day roadmap.
- `docs/MARKETING.md`: founder campaign, content templates and 30-day calendar.
- `docs/ECONOMICS.md`: pricing and monthly infrastructure/AI cost scenarios.
- `docs/PRESS-KIT.md`: editable press copy and approved feature descriptions.
- `docs/ASSETS.md`: supplied art integration and license status.

## Honest boundaries

This is a functioning local vertical slice, not a production-ready commercial service. External payment delivery, hosted models require their own end-to-end tests. No public deployment, token launch, email campaign or social post has been performed. Player movement is local visual state; economic commands are authoritative. Account recovery, email verification, distributed infrastructure, multiplayer position replication, entitlement delivery for future cosmetics, complete moderation and release-grade load testing remain ahead.

### Layered LPC citizens

Everwick now stores citizen appearance separately from the legacy fixed avatar. The Style section lets owned citizens change cosmetics, while newborn genetics are inherited from parents. Player households receive a short newborn design window and NPC households generate appearances automatically.

Character sprite layers are sourced from the Universal LPC Spritesheet Character Generator. See `/credits` and `client/lpc-attribution.json` for attribution information. The current alpha loads the curated LPC layers from the upstream public repository and falls back to the original Dreamland avatar if an external layer is unavailable.
