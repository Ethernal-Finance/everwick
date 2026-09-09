# Genealogy, aging, households, and citizen ownership

## Lineage generations

Every founding adult begins at numeric generation 0 and displays as Generation A. Free starter citizens display as Generation **S** and are outside the breedable A–Y bloodline. A child always receives one generation beyond the highest generation of either parent.

Examples:

* A plus A produces B.
* A plus B produces C.
* B plus B produces C.
* B plus C produces D.
* Y plus Y produces Z (terminal).

Generation **Z** is numeric **25**. Z citizens are sterile collectibles: they cannot form breeding partnerships or produce offspring. Labels after Z (AA, …) remain available for presentation if needed, but breedable stock stops at Y.

## Breeding gates (citizen economy P1)

1. **Starter sterile:** `starter: true` ⇒ `canBreed: false`; never partners for birth; not listable.
2. **Bloodline `canBreed`:** Gen A after primary claim is breedable; offspring inherit `canBreed` if **either** parent can breed.
3. **Per-citizen birth cap:** max **50** births as parent; both parents increment on each birth.
4. **Gen Z sterile:** generation ≥ 25 cannot breed.
5. **No hard global life cap** until at least one Gen Z exists in the world (`zReached`). After Z appears, the previous soft ceiling (500 living lives) may block further ordinary births/adulthood arrivals.
6. **Generation-scaled birth cooldown:** let `g = max(parent generations)` (A=0).  
   `cooldownDays = BASE_BIRTH_COOLDOWN_DAYS * (g + 1)`  
   where `BASE_BIRTH_COOLDOWN_DAYS = DAYS_PER_YEAR * 3` (the pre-existing A×A spacing). A×A ⇒ 1× base; B×B ⇒ 2×; Y×Y ⇒ 25×.

## Persistent genealogy

Citizens retain parent identifiers, child identifiers, partner identifiers, household identifiers, birthplace, current settlement, inherited genes, inherited personality tendencies, health, `canBreed`, `starter`, and `birthsAsParent`. Children keep the same genealogy when they become adults. Close kin are blocked from partnership formation through ancestry checks.

## Aging

The biological clock is accelerated independently of the hour clock. One citizen year currently passes every three town days. Children become adults at age 18, which means a newborn reaches adult citizenship after 54 town days. The rate is exposed in population state so it can be retuned later without changing lineage rules.

## Household readiness and births

Birth is not random population spawning. Adults first form a stable partnership (both must pass `citizenCanBreed`). A household is then evaluated for health, happiness, relationship quality, food security, financial stability, and available household space. A household must meet every minimum gate before a child can be born, and must respect the scaled birth cooldown and the 50-birth parent cap.

Children remain dependents until age 18. Their genes select one allele from each parent for craft, sociability, vigor, and appearance. Personality tendencies blend parental traits with bounded individual variation.

## Adult citizenship and marketplace

At age 18 a dependent becomes a full adult citizen. The adult keeps the same family history, birthplace, inherited traits, identity, and `canBreed` flag. Because descendants begin at Generation B, unowned newly grown adults are eligible for citizen marketplace listings priced in town coins. Generation A founders use the Stripe founder citizenship path for their first player acquisition. Once an A founder has completed that paid primary acquisition, its control rights can later be resold by players for town coins without changing the citizen's founder generation or history. Starter citizens never enter the marketplace.

A player account can own control rights to multiple adult citizens. Only one owned citizen can be directly controlled at a time. Switching control releases the previous citizen back to autonomous behavior and attaches control to the selected owned citizen. No citizen is cloned during a purchase or switch.

Player owned citizens can be listed for town currency while they are inactive. The currently controlled citizen cannot be listed. A listed citizen must be removed from the market before the owner can take control again. Marketplace purchases transfer existing currency between accounts or the town treasury and therefore preserve total money.
