# Everwick press kit — development edition

## Short description
Everwick is a persistent town of a hundred citizens with jobs, ambitions and long memories. Meet your neighbours, run a business, and return to discover the stories that unfolded while you were away.

## Long description
Life in Everwick does not pause when you close the game. Farmers produce food, shops buy supplies, employers pay wages, and residents pay rent. Players enter a town that already has its own routines, then become part of it through conversations, friendships, property and business ownership.

Every economic change has a source: businesses sell actual stock, employees spend actual wages, and poor management can force a shop to close. Citizens remember meaningful interactions. A generous tip, a new job or a dismissal affects their opinion of you. The Glob Gazette turns recorded town events into a daily newspaper, giving returning players a reason to ask what happened next.

The current local alpha contains one town and emphasizes the first-business loop. It uses deterministic simulation for daily life and supports optional model-assisted dialogue through a provider boundary. Multiplayer, expanded stories and final founder-benefit delivery remain in development.

## Factsheet

| Item | Current information |
|---|---|
| Working title | Everwick |
| Genre | Persistent town simulation / business management |
| Platform | Desktop web browser, local Node server |
| Current status | Playable local vertical slice |
| Population | 100 seeded citizens |
| Businesses | 12 seeded businesses with wages, recipes and inventories |
| Art | Fantasy Dreamland by ElvGames; custom town composition |
| Currency | Internal game coins only; no blockchain |
| Release date | Not announced |
| Final price | Not announced; pricing experiments documented separately |
| Founder campaign | Proposed $25 / $75 / $199 / $499 supporter tiers |
| Public website | Not deployed yet |
| Press contact | Must be supplied by the project owner before release |
| Social/community links | Not announced; no placeholder accounts implied |

## Founder story
Editorial draft requiring the real founder's name and approval: “We wanted neighbours whose lives continue after the player leaves: people who earn a living, remember a kindness and occasionally make a terrible business decision. Everwick begins with one small town so we can make those everyday stories worth coming back to.”

This is product positioning, not a claimed personal biography or quotation from a named person.

## Verified feature copy
- Walk around a town and inspect citizens' routines, goals, cash, employers and memories.
- Buy and operate businesses; adjust prices, wages, hours and operating funds.
- Buy rental property, receive rent and respond to tenants' financial constraints.
- See production, consumption, wages and rent in an authoritative economic ledger.
- Return to recorded events and read daily editions of The Glob Gazette.
- Use local memory-based dialogue or configure an external compatible model.

## Media
The downloadable development kit includes a town-map render drawn by the game renderer from a simulation snapshot, a typographic logo, these product descriptions and the current roadmap. Town-map renders are labeled as such; they are not fabricated screenshots of a finished multiplayer product. Keep ElvGames attribution with promotional artwork. Do not redistribute standalone sprite sheets.

## FAQ
**Can journalists play it?** Locally, yes. A publicly accessible preview is not yet hosted.

**Does every NPC use a model?** No. Daily life is deterministic; optional model assistance currently focuses on player conversation.

**Does it support crypto?** No. The project removed blockchain to use its chosen art license and focuses on conventional game systems.

**Is it production ready?** No. It needs hosted operations, external integration tests, account lifecycle/security work and observed retention before a commercial launch.

## Technical summary
Dependency-free Node 24 server, SQLite WAL database, modular simulation/auth/payments/AI layers, browser Canvas renderer, signed Stripe webhooks and server-authoritative economic commands. One process owns each town. Cloud/distributed scaling is planned, not benchmarked.
