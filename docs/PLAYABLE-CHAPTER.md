# Playable first chapter

Story is the starting panel. Walk to Town Hall, collect a town-funded five-food shipment at Sunfield Farm and deliver it to Willow Clinic. The shipment is reserved cargo; delivery moves the exact stock, pays 1,000 coins and creates a clinic memory and community news event. The next milestones recognize ownership of a home, placed furniture, and a business. Rewards are one-time and saved atomically with progress. Existing ownership qualifies.


Inherited citizenship cash alone does **not** buy a home or business. The first clinic delivery pays **1,000** coins from the treasury (no mint). Starter homes are valued around **900** ◈; Green Dragon Tavern is the **1,200** ◈ starter listing. Repeat farm-to-clinic contracts still pay 120.
After the initial delivery, repeatable farm-to-clinic contracts pay 120 coins with a six-town-hour cooldown. Farm stock and treasury cash are required. The game does not create free goods or duplicate rewards.

Outdoor movement is saved on the server and checked for distance, route length and collisions. Click Show walking route to follow a destination. A gold marker highlights the current story location. Press E nearby to open Story, then use its action button. No quest progress is claimed merely by clicking a remote marker.

35 automated tests pass, including the entire six-stage chapter, repeatable deliveries, movement rejection and conservation. Browser verification confirmed the Story UI and a guided route reaching Town Hall with its position persisted. The user was interacting during further browser checks, so no story milestone was submitted on their account.

This completes the first chapter implementation, not the full original vision. Remaining substantial work includes richer mission interactions, a sustainable long-run economy, additional populated districts, vehicles/combat if retained in scope, balance playtesting, and public-launch payment/deployment verification. See DEPLOYMENT.md for the server setup.

## Business and macro economy

Owners can recapitalize and reopen a closed business after settling wage debt and paying a 100-coin reopening fee from business cash. The Economy panel shows employment, severe hunger, stock, prices and seven daily snapshots. Thirty snapshots are retained. A fresh 30-day simulation ended with 11 of 12 businesses open and one severely hungry citizen; this is one deterministic scenario, not a guarantee under player interventions.

## Neighbourhood contracts

Jobs adds three business-funded routes: mine to forge (ore), farm to restaurant (food), workshop to warehouse (tools). Pickup removes real supplier stock and transfers the purchase cost from the customer. Delivery restores that stock to the customer. Players choose their quoted fee or waive it for stronger relationships with current staff. Delivery creates a community news event. Cargo, cooldowns and mission history persist. If the customer cannot pay at delivery, cargo remains intact so the player can wait or waive the fee. The eight-hour cooldown applies per route.

42 automated tests pass, including each route and outcome, money/item conservation, memories, duplicate rejection, cooldowns, persisted cargo and failed-payout rollback.

## Shared player presence and house visits

Signed-in accounts receive other online players in the 300 ms movement feed. Public presence contains only display name, appearance, location, direction and room. Position heartbeats keep players online; they disappear after 15 seconds without updates. Separate accounts are separate citizens; two tabs of the same account share one citizen.

Player-owned properties carry owner labels on their corresponding map building. Rental units share an apartment building; cottages have individual buildings. Homes lists visitable neighbour properties. Visitors see the saved furnishing layout and other occupants, and can walk indoors. All decoration mutations still require ownership. Multiplayer uses the existing single-server polling transport, not peer-to-peer or multiple world replicas. Internet access requires deploying the shared server; localhost is only on this computer.

44 automated tests pass. Two independent authenticated HTTP sessions verified shared presence, owner labels, house entry, indoor movement, visitor mutation denial and offline expiry.

## Farm and town economy

The Farm panel provides twelve shared plots, at most two per player. Crops require seed food, fees, watering and growth time; soil fertility declines after harvest and can be restored with compost. Seasons change every seven town days. Infrastructure level one reduces watering requirements. Food harvested can be cooked, traded, gifted or listed on the player market.

Craft & Market adds meals, tools and goods made at local stations. Fees fund the workshop; recipe inputs are consumed once and finished goods collected once. Player listings reserve inventory, allow partial fills, and return unsold stock on cancellation. A two-percent fee rounded up funds the town. Affordable food listings attract nearby NPC customers. The Economy panel reports traded volume, average player-market prices and listed supply. Daily account ballots select reserve, infrastructure or food-relief spending from collected fees; ties reserve the money.

54 tests pass, including crop care, soil, crafting, listing settlement/cancellation, NPC buyers, fee conservation and budget votes. These are local mechanics with accelerated town time, not a claim of matching the scope of Stardew Valley or SimCity.

## Persistent construction

Build offers nine planned expansion parcels and three blueprints: cottage, neighbourhood shop and market garden. Sponsors pay permits, construction wages and business operating capital. Contributors deliver existing tools, goods, ore or food. Materials are consumed on completion. Players work automatically while at the site and connected; unemployed NPCs can choose building work, and selected employed citizens take evening building shifts. Craft skill increases work speed. Labour pays from the saved construction account, which is included in total world cash.

Completed cottages become owned, visitable, decoratable properties. Shops and gardens become businesses with jobs, inventory, recipes and cash; owners manage them through the existing Business panel. Sites and completed structures use supplied Fantasy Dreamland artwork. Parcels reserve collision footprints and connecting roads so expanding buildings cannot overlap existing town structures. NPCs participate in funded projects; autonomous NPC project planning is not implemented.

58 tests pass, including all blueprint completions, persisted world objects, conservation, wages, duplicate completion prevention and reachable entrances.
