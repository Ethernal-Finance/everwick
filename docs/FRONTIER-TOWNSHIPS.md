# Frontier Townships

Frontier townships connect Everwick's individual citizen simulation to the regional economy.

## Design rule

A macro statistic should be traceable to micro behavior. Population growth comes from individual migration. Employment comes from individual jobs. Housing pressure comes from actual resident capacity. Landmark production comes from residents working a local sector.

## Frontier state

Each frontier has a fixed world coordinate, biome identity, landmark, economic focus and landmark production multiplier. A frontier begins in the `wild` stage.

Town Hall construction moves it through these stages:

* `wild`
* `hall-building`
* `hall-ready`
* `chartered`

The Town Hall is intentionally required before the charter so founding is a world action rather than a menu action.

## Town Hall

Starting the Town Hall costs 600 coins. The payment moves from the founding player to the regional treasury. The Town Hall requires four construction shifts while the founder is physically near the site.

A completed Town Hall does not itself create a township. It only unlocks the charter.

## Charter

The charter costs 2,200 coins. The payment becomes the new township treasury. The founding player becomes the first mayor for a fourteen day term.

The township begins with one camp level housing space and a small landmark linked labor sector. Growth therefore requires deliberate housing and economic development.

## Development

Housing rows add six resident spaces. General stores add commerce jobs. Workshops add jobs to the town's selected economic focus.

Town development is paid from the township treasury into the regional treasury. This preserves the currency conservation rule.

## Migration

Unclaimed adult residents may move between settlements. The decision model weighs employment, wages, rent, available housing, service quality, income tax, migration policy, incentives, family and social connections, and personality traits.

Claimed citizens do not autonomously migrate.

## Landmark production

Each frontier landmark is linked to an item and a starter sector. Residents working that sector create regional stock during the daily civilization tick. The landmark multiplier scales that output.

This is physical production, not free currency. The new items are recorded in `world.produced` and in the township stock ledger.

## Rendering

Frontier regions are part of the existing large world map. The renderer shows the landmark first. Town Hall scaffolding appears during construction. After chartering, the renderer adds the Town Hall and later housing, stores and workshops around the settlement core.

Regional residents retain the remote macro simulation model, but they receive a regional map position so the settlement visibly gains population and those residents can be selected on the map.

## Save compatibility

`ensureCivilization` upgrades older civilization saves by adding the frontier layer and landmark metadata. Existing unanchored townships from the previous civilization build are preserved as legacy settlements rather than deleted or reassigned.
