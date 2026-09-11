# Procedural Dungeons

Everwick includes the Copperhill Catacombs as a player controlled expedition system. The entrance is a physical location near Copperhill Mine. A citizen must travel there and remain under direct player control before a run can begin.

## Player control rule

Dungeons are never completed by autonomous citizen routines. Entering a dungeon requires the currently owned citizen to be under direct player control. While a run is active, normal town commands and citizen switching are blocked. If the player disconnects long enough for control to expire, the run is abandoned and the citizen returns outside the entrance without a clear reward.

## Procedural generation

Every entry creates a new seeded maze. The maze contains a reachable start, a reachable exit, three rune seals, guardians, hidden traps, supply caches, shrine rooms, and an optional relic vault. The generator verifies the topology by carving one connected maze, so all objectives are part of the same traversable floor network.

Successful clears gradually raise the expedition tier. Higher tiers use larger mazes and stronger guardians.

## Objective

The player must recover all three rune seals and then reach the exit gate. The exit can be found before the seals, but it remains locked until all three are collected.

Movement uses WASD or the arrow keys. Guardians interrupt movement and must be defeated or escaped through the Dungeons panel.

## Optional rooms

Each run can contain two shrine rooms and one relic vault.

* Mending shrines restore dungeon health once.
* Wayfinder shrines reveal a nearby remaining objective: a rune seal, an unclaimed relic vault, or the exit gate once every seal has been recovered.
* The relic vault marks an artifact as claimed inside the run. The artifact is only added to inventory if the player clears the dungeon afterward. Dying or abandoning the run leaves the claimed relic behind.

## Combat and supplies

A guardian encounter supports four choices.

* Strike damages the guardian.
* Guard reduces the next incoming hit.
* Use food ration consumes one real food item and restores dungeon health.
* Flee attempts to break contact.

Dungeon health is separate from the citizen's ordinary life health during the expedition. Falling to zero ends the run and then applies consequences to the persistent citizen.

## Failure consequences

Death has a real cost.

* Recovery moves 12 percent of carried coins to the Everwick treasury, capped at 500 coins.
* One carried inventory item is lost when an eligible item is available.
* The citizen returns with reduced persistent health and low energy.
* The run is recorded as a dungeon death.

Abandoning a run voluntarily gives no clear reward, but does not apply the death penalty.

## Rewards

Supply caches and defeated guardians can add physical goods during the run. These items are recorded in the production ledger.

A successful clear grants ore and goods as produced expedition loot. If the relic vault was claimed, the clear also returns one artifact and increases the treasury-funded coin bounty. If the treasury cannot cover the full bounty, only the available amount can be paid. The dungeon does not create coins.

## Art

The dungeon renderer uses the supplied Fantasy Dreamland Dungeon artwork, including the dungeon tiles and dungeon door sheet. The overworld renderer remains on the stable asset mapping used by the canonical Everwick build.
