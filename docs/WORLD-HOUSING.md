# World and housing update

The world spans 1,000 by 1,000 tiles with procedural terrain, a populated founding town, 12 purchasable cottages and six travel destinations. Distant biomes do not yet contain additional simulated settlements. Only visible terrain renders; bounded A* limits route search.

Owned homes have persistent interiors, eight furniture types, rotation, storage and collision validation. The Homes panel provides entry, purchases and coordinate placement. WASD moves indoors. Layout revisions reject stale concurrent edits. House purchases and furniture payments use authoritative transactions and existing command idempotency.

NPC movement runs between economy ticks. On-site workers receive production attribution; unemployed residents tend public space and replenish social needs. Citizens retain sleep, work and shopping routines. Contribution counters appear in citizen details. Goods procurement is still an economic transaction rather than physical courier delivery. This is a local simulation release, not certification of production readiness or a complete autonomous society.

Validation: 25 automated tests pass, including 30 simulated days, conservation, housing persistence, permissions and layout constraints. Native canvas renders checked separately from browser interaction testing. External deployment and load validation remain outstanding.

## Gameplay and launch update

Complete house crops replace roof-only art; housing rows now have nine-tile spacing. Desert terrain uses the matching supplied pack. All supplied ZIP archives are catalogued in asset-inventory.json; not every pack is placed in the playable world.

Activities offer cooldown-based work, deliveries and abstract street races. They are resolved by server-side odds, not driving or combat minigames. Energy recovers, heat affects risk, fines and payouts conserve money, and collective infrastructure raises business output.

Starter character onboarding and purchasable character slots are implemented. All characters currently share account wealth and property. Stripe-confirmed entitlements control extra slots. Docker/Caddy configuration and a preflight command are included; live checkout and deployment have not been exercised.

Current suite: 28 passing tests. Browser confirmed onboarding loads. Native render confirmed complete house walls and doors.

## Citizen decision update

Citizens now use local scored decisions based on needs, personality, employment, affordability and time. Task commitment avoids changing destinations every frame. Sleep schedules are staggered; nearby social encounters restore social needs. Profiles expose the decision reason. The optional language model remains dialogue-only. This is not LLM-controlled autonomy.

31 automated tests pass. A live 1.2-second motion sample at hour 16 recorded 81 citizens changing position; the ending states were 79 travelling, 10 socializing, 9 working and 2 shopping. This is a sample, not a guarantee that every citizen walks constantly.
