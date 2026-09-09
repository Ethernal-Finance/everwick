# Everwick Frontier Township Update

This update turns the regional civilization layer into a physical frontier system on the existing 1,000 by 1,000 world map.

## Founding loop

A township can no longer be created from a menu alone.

1. Travel to an undeveloped frontier region.
2. Break ground on a Town Hall for 600 coins.
3. Complete four construction shifts at the site.
4. Sign the township charter and capitalize its treasury with 2,200 coins.
5. Build housing, stores and workshops at the settlement site.
6. Use wages, services, taxes, housing costs and migration incentives to compete for residents.

The combined Town Hall and charter cost remains 2,800 coins. The money is transferred into regional or township accounts rather than created or deleted.

## Frontier regions and landmarks

Six buildable regions are now placed around the map.

* Bluewater Reach. Silverfin Shoals gives 1.50 times output to fish and food production.
* Fernwood Vale. Elderwood Grove gives 1.35 times output to timber goods.
* Ironcap Basin. Ironcap Quarry gives 1.50 times output to ore production.
* Saffron Expanse. Sunspice Flats gives 1.40 times output to trade goods.
* Frostmere Shelf. Glacier Springs gives 1.30 times output to care goods.
* Sunmeadow Prairie. Golden Loam gives 1.45 times output to crops and food.

Everwick now formally treats Copperhill Mine as its home landmark and applies an ore production bonus to the mine.

## Physical settlement growth

Chartered frontier towns now appear at their actual map coordinates. Their Town Hall, housing, stores, workshops, settlement name, population and regional residents are rendered in the world.

Town development is split into distinct systems.

* Housing row. Costs 700 township coins and adds six resident spaces.
* General store. Costs 900 township coins and adds four commerce jobs.
* Workshop. Costs 1,200 township coins and adds four jobs in the township's economic focus.

Construction must be commissioned while the mayor is physically at the township site.

## Migration and macroeconomics

Unclaimed adult citizens continue to compare towns using wages, open jobs, housing, rent, taxes, services, migration policy, migration incentives, social ties and personality.

New development now feeds those decisions directly. Housing creates migration capacity. Stores and workshops create employment. Wage policy changes the value of those jobs. Public services and rent affect quality of life.

Migrated citizens keep participating in the regional wage, rent and tax economy. Their regional positions are also exposed to the map renderer so the new town is visibly inhabited.

## Landmark production

Frontier residents working the landmark linked sector create regional physical stock each simulated day. The landmark multiplier increases the quantity produced. Production is recorded in the world production ledger and in each township's regional stock.

## Government

The local, regional and national hierarchy remains in place. Frontier towns still have mayors, terms, elections, treasuries, taxes, minimum wage, migration policy, zoning, public services and economic development controls.

A new town treasury contribution control lets players add capital without creating currency.

## Verification

All 74 automated tests pass. The suite now explicitly verifies the physical Town Hall requirement, charter capitalization, housing capacity, job creation, migration, regional resident placement, landmark production and cash conservation.

The production build also completes successfully.

## Local citizenship preview fix

Localhost now automatically enables development citizenship preview when NODE_ENV is not production. This lets local testers claim an existing resident without Stripe credentials. Set ALLOW_DEMO_CITIZENSHIP=0 to test the real payment gate locally. Production never enables the preview path. Payment configuration errors now return a useful message instead of the generic service unavailable text.

# Genealogy and Fishing Update

## Generational lineage

Every founding citizen now displays as Generation A. Children advance one generation beyond the highest generation of either parent. A plus A creates B, A plus B creates C, and the same rule continues through Z into AA, AB, AC, and later labels.

Citizens now preserve parent, child, partner, household, birthplace, health, generation label, inherited genes, and inherited personality tendencies. Close kin are blocked from forming breeding households through ancestry checks.

## Faster aging

One biological year now passes every three town days. A newborn reaches age 18 after 54 town days. Children remain dependents until adulthood and become normal adult citizens without replacing or duplicating their original life record.

## Healthy household births

Births now require a stable partnered household. Household readiness evaluates health, happiness, relationship quality, food security, finances, and housing space. Unhealthy, hungry, unstable, or overcrowded households cannot produce children. Births also have a multi year cooldown.

## Citizen ownership and marketplace

Players can own multiple adult citizens. Only one citizen can be directly controlled at a time. Switching control returns the previous citizen to autonomous simulation and moves control to another owned citizen.

Unowned adults are eligible for the citizen marketplace using in game coins. Newly grown adults are automatically eligible. Players can buy additional citizens, list inactive owned citizens, and cancel their listings. Market purchases conserve total currency and do not reset a citizen's family, memories, possessions, job, age, or history.

## Fishing repair

Fishing now works beside any fishable shoreline instead of only at Willowbank. Willowbank, Silverfin Shoals, and wilderness waters have independent stocks. Silverfin Shoals receives the Bluewater abundance advantage with larger stock and faster replenishment.

## Verification

All 77 automated tests pass. New coverage verifies lineage labels, inherited offspring, healthy household gating, accelerated adulthood, adult marketplace eligibility, multi citizen ownership, control switching, money conservation, and fishing at multiple shorelines.


## Founder market and Silverfin casting correction

Generation A remains permanently reserved for founders. Unowned A citizens remain autonomous AI founders until claimed through the founder citizenship flow. Production founder claims require the Stripe entitlement path, and the first paid acquisition is recorded on that specific founder. An unowned A founder can never be bought directly with town coins. After the paid primary acquisition has happened, the owner may list that A founder on the in game citizen marketplace for town coins. Future owners may resell the same founder again for town coins. Development preview or legacy A citizens without a recorded paid primary acquisition remain blocked from coin resale.

Generation B and every later adult generation remain eligible for the in game citizen marketplace without a Stripe primary acquisition. All marketplace transfers preserve the citizen's life, genealogy, property, memories, employment, relationships, and founder history.

Fishing casts now persist the actual world water coordinates where the line was thrown. The renderer uses those coordinates for the line and bobber, so a cast at Silverfin Shoals stays visually at Silverfin instead of drawing back to Willowbank. The Silverfin fishing landmark can also open the fishing panel directly, and the Willowbank route button is hidden while the player is already beside fishable water.


## Founder secondary market correction

Generation A now has a primary and secondary market distinction. The primary acquisition of an unowned A founder requires Stripe in production. Once that founder has a recorded paid primary purchase, its current owner may list it for in game coins, another player may buy it for in game coins, and that later owner may list it again. The paid founder marker stays attached to the citizen across every resale. Unpaid development preview founders stay excluded from coin resale.

The automated suite remains at 78 passing tests and now covers paid A founder resale, repeated secondary resale, unpaid A resale rejection, Generation B market behavior, and currency conservation.

## Demo founder pair and autonomous A breeding

Local development demo citizenship now grants two unrelated Generation A founders to the same demo account after the first founder is selected. One remains the active controlled citizen and the second remains autonomous until the player switches control. On a fresh demo world the pair is placed into a strong household relationship so the accelerated genealogy loop can be tested without a Stripe transaction.

Demo founders are explicitly marked as development founders and do not receive a primary Stripe purchase marker. They therefore remain blocked from the in game coin resale market. This does not change production founder rules.

Autonomous Generation A founders are fully eligible for relationship formation and reproduction. Unowned A citizens can partner with other eligible A citizens in the same settlement, and player owned A citizens can continue participating while autonomous. The genealogy kinship check remains mandatory, so close relatives cannot form breeding households. Healthy household readiness still controls whether a partnered household can produce a child.

The automated suite now passes 81 tests. New coverage verifies the two founder demo account flow through the HTTP API, demo founder non resale status, Generation A to Generation B reproduction, currency conservation during demo setup, autonomous A partnership, and close kin rejection. The production build also validates successfully.

## LPC Citizen Appearance Update

This build adds the first native Everwick character appearance system using layered Liberated Pixel Cup artwork.

### Citizen identity

* Existing citizens are migrated to deterministic LPC appearance profiles without changing their genealogy or economic state.
* Genetic appearance records skin tone, natural hair color, eye color, and LPC body frame.
* Cosmetic appearance records hair style, hair dye, top style and color, and legwear style and color.
* Older saves keep their existing Dreamland avatar as a fallback if an LPC layer cannot load.

### Birth and inheritance

* Children inherit appearance genetics from both parents.
* Skin tone choices use a bounded parental range.
* Natural hair and eye choices come from parental traits.
* NPC only households generate child appearances automatically.
* If a player owned either parent at birth, that account receives a three town day newborn customization window.
* Newborn customization cannot select genetic traits outside the inherited options.
* Customized appearance follows the child into adulthood.

### Cosmetics

* A new Style section is available in the game navigation.
* Owned adult citizens can be restyled with ordinary Everwick coins.
* Genetic identity cannot be changed through the cosmetic service.
* Cosmetic payments move existing coins into the town treasury.
* The data model is ready for future barber, tailor, shoe, jewelry, and cosmetic shops.

### LPC attribution

* `/credits` is now a public credits page.
* `client/lpc-attribution.json` records every LPC asset family used by this build.
* The credits page links to the Universal LPC repository and its detailed `CREDITS.csv` asset registry.
* The browser currently streams the selected LPC sprite layers from the public upstream repository. If a layer cannot load, Everwick falls back to the existing Dreamland citizen sprite.

### Validation

* 86 automated tests pass.
* Production build validation passes.

## Appearance Shop Economy Update

Cosmetic editing is no longer a free global character editor. Adult citizens now use physical Everwick businesses for appearance services and wardrobe purchases.

### Physical appearance businesses

Everwick now includes four persistent appearance businesses on the town map. Shear & Comb provides barber services, Needle & Thread sells tops and legwear, Last & Sole sells shoes, and Gilded Finch sells jewelry. Existing saves receive these businesses automatically when loaded.

Each shop has a real business account, employees, wages, stock, ownership, opening status, and map location. Appearance purchases transfer existing coins to the shop rather than deleting or creating money. A completed service or purchase also consumes one unit of shop goods supply. Players can sell ordinary goods to appearance shops as restocking supply.

### Barber services

Hair style and hair color changes require the controlled citizen to physically visit Shear & Comb. Haircuts and dye have separate prices, and changing both pays the combined service cost. Genetics such as skin tone, eye color, body frame, and natural inherited traits remain locked.

### Wardrobes

Clothing is now owned per citizen. Buying a top, legwear item, pair of shoes, or jewelry adds that exact item to the citizen's persistent wardrobe and equips it. Once owned, the citizen may wear that item again for free without returning to the shop or paying a second time.

New citizens keep only their starter outfit as owned clothing. Existing saves are migrated by treating the citizen's currently worn outfit as their initial owned wardrobe instead of unlocking every cosmetic option.

### Shoes and jewelry

The LPC renderer now supports basic shoe layers plus stud and simple earring layers. These layers follow the same pinned LPC commit as the rest of Everwick's character art and are registered in the public attribution file.

### Birth appearance

The inherited newborn appearance window remains free because it establishes the child's initial identity. Once that window closes, later adult cosmetic changes use the normal shop economy.

### Validation

All 89 automated tests pass. New coverage verifies physical barber access, business payment and stock consumption, wardrobe ownership, free re equipping of owned clothing, separate cobbler and jeweler access, preserved genetics, LPC layer order, money conservation, and existing simulation behavior. The production build also validates successfully.


## Physical appearance shop counter refinement

The Style panel is now a wardrobe only. It lets the active citizen equip clothing, shoes, and jewelry they already own at no cost. It does not expose new purchases or barber controls.

Haircuts and hair dye are available only from the Shear & Comb counter while the active citizen is physically present. New tops and legwear are sold only at Needle & Thread, shoes only at Last & Sole, and jewelry only at Gilded Finch. Opening those businesses remotely shows a route instead of transaction controls. Server distance validation remains authoritative.


# Procedural Dungeon Update

## Copperhill Catacombs

A physical dungeon entrance now exists near Copperhill Mine. The active citizen must travel to the entrance and remain under direct player control before entering. Autonomous citizens and NPC routines cannot begin, continue or complete a dungeon. Citizen switching and ordinary town commands are blocked while an expedition is active.

## New maze every run

Each entry creates a new connected procedural maze. Every run contains three rune seals, a sealed exit, guardians, traps and supply caches. All objectives are generated on reachable floor cells. Successful clears increase expedition tier over time, which increases maze size and guardian strength.

## Risk and reward

Dungeon death moves 12 percent of carried coins to the town treasury, capped at 500 coins, removes one carried inventory item when possible, and returns the citizen with reduced health and energy. Voluntary abandonment gives no clear reward but does not apply the death penalty.

A successful clear produces ore and goods and can pay a bounty from the existing town treasury. The bounty is limited by treasury cash, so dungeon rewards do not create currency. Supply cache and guardian loot are also recorded in the physical production ledger.

## Player controls

WASD and arrow keys move through the generated dungeon. Guardian encounters are resolved through the Dungeons panel with strike, guard, ration and flee actions. The map uses fog of war, so rooms and hazards are revealed as the player explores.

## Art and stability

Dungeon rooms use the supplied Fantasy Dreamland Dungeon tiles and door artwork. The stable overworld asset mapping is unchanged.

## Validation

The dungeon suite verifies procedural variation, objective reachability, direct player control, persistent death penalties, treasury funded rewards and physical loot accounting. The full regression suite passes 94 automated tests.
