# Citizenship and continuing lives

Registration creates an account **and** grants one free **starter** citizen (auto-controlled). The starter is tagged `starter: true`, `canBreed: false`, and non-transferable / non-listable. Starters never breed. There is no 4,500 coin mint on registration; starter cash is a modest treasury transfer.

A paid founder entitlement (or local demo preview) still claims an unowned **Generation A** founder as additional bloodline stock. The account may own multiple citizens but can directly control only one at a time. Switching control does not create a copy. The previously active citizen immediately returns to autonomous simulation while the selected owned citizen becomes active.

Every citizen keeps the same underlying life record whether controlled or autonomous. Their name, age, generation, family, birthplace, appearance, health, personality, skills, occupation, needs, cash, possessions, residence, memories, and relationships remain attached to the citizen.

Visible input keeps the active citizen under player control. After inactivity or disconnect, that citizen resumes needs based movement, work, shopping, social activity, and other simulation behavior. Free starter play does not require Stripe; controlling a claimed Gen A founder still follows entitlement / demo / legacy access rules.

## Citizen marketplace

Generation A citizens are founders. Unowned Generation A citizens remain autonomous AI founders unless a player claims one through the founder citizenship flow. In production, the first player acquisition of a specific A founder requires an active Stripe entitlement. That paid primary acquisition is recorded on the citizen and sets `canBreed: true`. Afterward, the owner may list that A founder on the in game marketplace for town currency, and later owners may resell the same founder again for town currency. Unowned A founders and development preview A founders that never completed a paid primary acquisition cannot be purchased for coins. **Starter citizens cannot be listed or transferred.** Generation B and all later adults use the citizen marketplace normally. A child cannot be bought or controlled before age 18. The currently controlled citizen cannot be listed. Marketplace settlement transfers existing currency to the seller or town treasury and therefore does not create money.

## Breeding rights (P1)

`canBreed` is a bloodline flag on the citizen. Starters are always sterile. Gen A founders are breedable bloodline stock (confirmed `canBreed: true` after primary claim). Offspring inherit `canBreed: true` if either parent can breed. Gen Z (numeric 25) is terminal and cannot breed. Each citizen may act as parent for at most **50** births (both parents increment). See `docs/GENEALOGY.md`.

## Genealogy

All founding adults are Generation A. Starters display as Generation **S**. Offspring advance one generation beyond the highest generation of their parents. Parent, child, partner, household, birthplace, genes, and inherited personality tendencies persist through adulthood. See `docs/GENEALOGY.md` for the full model.

## Development access

For isolated development, localhost automatically enables free Gen A citizenship preview unless `ALLOW_DEMO_CITIZENSHIP=0`. Production always ignores development preview access for Gen A claims. Real purchases require Stripe configuration and verified webhook fulfillment. Full refunds revoke paid Gen A account access while the free starter remains playable and citizens continue autonomously.
