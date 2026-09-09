# Simulation and memory

## Town clock and schedules
100 adult residents start employed across 12 businesses and housed in 100 rental records. One deterministic tick represents an hour. Residents sleep, work, shop and socialize on schedules. A town day is 24 ticks; default tick duration is 15 seconds. Prices and news update daily. No random cash, revenues or headlines are injected.

The server worker reads the durable timestamp and runs at most 96 overdue economic ticks per pass, replaying elapsed movement between them. Each tick advances the timestamp only in a committed SQLite transaction. Large absences are caught up over subsequent passes; the UI indicates lag. The map is 56 × 46 tiles with town, forest, farmland, mining ridge and waterside districts. NPC movement uses collision-aware paths and server updates every 200 ms; the client interpolates 300 ms snapshots. Walking is independent of the 15-second economic hour. Food purchases occur at food shops, specialty shopping follows afternoon visits, and production uses workers who have reached their workplace. Player visual movement is currently local and does not authorize economic transactions.

## Money and goods
All prices are integer coins. A transfer debits one real account and credits another. Failed trades change neither stock nor balances. Starter coins are transferred from the finite town treasury, making starter-account creation a resource constraint rather than unlimited money creation.

Farms and the provision operation produce food; mines produce ore. Toolmakers consume two ore per tool. Hospitality, clinic and retail consume food for their output. Food and tools are physical stocks. Tool wear creates replacement demand. Recipes are intentionally abstract for the vertical slice; clinic/inn units represent service availability. Output stops when inventory reaches the buffer based on measured sales. Businesses choose suppliers; residents consider price, distance, advertising and relationship when choosing a seller. Specialty purchase thresholds reject extreme pricing.

Daily wages transfer to employees. Missed wages remain liabilities after an employee leaves and can force closure. Sustained losses lead NPC proprietors to reduce staffing. Better-paying solvent employers attract workers; negative relationships can prevent recruitment. Rents transfer to individual landlords. NPC-owned profitable firms share a surplus with staff and pay owner dividends, preventing all earnings from remaining permanently trapped in corporate accounts.

Player controls include prices, wages, opening hours, promotion spend, hiring available workers, firing, restocking, deposits, withdrawals and three capacity upgrades. Business purchase changes legal ownership in the simulation and leaves its operating account intact. Manipulating client JSON cannot directly change cash or inventory. Idempotency keys prevent replaying a command from purchasing or paying twice.

## Failure and tuning
The baseline is a small closed economy, not a forecast of real markets. Business failure is allowed. Cash and material conservation are tested across 30 days, alongside wages, rent and purchasing. Long-horizon playtesting still needs starvation, rent concentration, competitive concentration and boredom metrics. A catastrophic default collapse is a defect; an avoidable collapse caused by deliberate mismanagement is a game event.

## Memory
Residents keep bounded recent memories (32), a compressed summary and per-subject relationships from -100 to 100. Retrieval combines importance, exponential age decay, subject match and relevant words; only five selected memories enter dialogue context. Repeated memories reinforce importance. Tips, conversations, hiring/firing, missed wages and social visits affect relationships.

NPC entrepreneurs can purchase an available business when cash exceeds both its valuation and a reserve. The first release does not procedurally construct entirely new premises. Political, marriage and robbery systems are not implemented and are not fabricated in news.

## Newspaper and returning players
Each daily edition is assembled from actual recent economic and social event records. A quiet day receives a quiet headline. Return briefings compare the last seen tick to the current event history. Recent events, news and ledger entries are bounded in the snapshot; indefinite event archival is a future migration.

## Player trading
The Trade tab lists actual shop stocks and asks. Players can buy 1–10 units per command and sell goods to businesses that consume them. Bid prices are 80% of the town reference price. Trades require sufficient cash and stock on both sides and share the authoritative ledger/idempotency path. Player trade orders settle remotely; physical courier logistics and a player-to-player order book are not implemented.
