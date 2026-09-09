# Everwick Civilization Simulation

Everwick now simulates more than one town. The rendered Everwick map remains the detailed local play space, while the civilization layer tracks regional settlements and lets unclaimed citizens relocate between them.

## Simulation hierarchy

The world has three government levels.

1. National government, represented by the Commonwealth of Everreach.
2. Regional government, represented by Greenvale Region.
3. Local governments for Everwick and every player founded township.

Local governments have a mayor, council structure, treasury, taxes, policies and public service levels. Mayoral terms are fourteen town days and NPC citizens participate in elections.

## Townships

Players can charter a township from the Government panel for 2,800 coins. The founding capital is transferred into the new township treasury. It is not newly created money.

Each township tracks:

* Population
* Employment and unemployment
* Open jobs
* Average wage
* Housing capacity
* Average rent
* Land value
* Quality of life
* Local treasury
* Income, business, sales and property tax rates
* Minimum wage
* Migration incentives
* Zoning priority
* Migration policy
* Roads, schools, safety and health services
* Local resources
* Economic sectors and job slots
* Town identity
* Migration history

Founders choose a balanced, agricultural, industrial or trade focus. The focus changes initial resources, wages and available job sectors.

## Citizen migration

Only unclaimed citizens can autonomously move between settlements. Claimed citizens remain attached to their player life.

Each unclaimed adult compares settlements using:

* Available wage
* Actual open jobs
* Rent
* Income tax
* Public services
* Safety preference
* Ambition
* Thrift
* Social and family ties
* Migration policy
* Migration incentives

A citizen does not move simply because another wage is one coin higher. The alternative must materially improve their total opportunity score. Recently moved citizens also have a cooldown to prevent constant town hopping.

When a citizen leaves Everwick, their local job and home are released. When they join another settlement, they take an available sector job and become part of that town's population, employment, housing and tax statistics.

## Remote town economy

Remote settlement wages are paid from that town's real treasury. Remote residents pay rent back into the local treasury. Income taxes are transferred from wage recipients to the government account. Public service work pays real civic wages.

This means a township can overextend itself. A new town with high wages but weak finances can eventually miss payroll, lose jobs and become less attractive to migrants.

## Local government controls

The current mayor can change:

* Income tax
* Minimum wage
* Migration incentive
* Migration policy
* Zoning priority

The mayor can also fund roads, schools, safety and health services, or finance sector expansion that creates additional job slots and housing capacity.

Public development spending moves from the local treasury to the regional treasury, preserving currency conservation.

## Macro and micro link

The core rule is that macro statistics are produced from citizen events. Population changes because named citizens actually move. Employment changes because citizens actually take or lose jobs. Tax revenue comes from actual wage transfers. Treasury stress can cause actual job loss. Town identity is derived from the employment mix and resources rather than selected as a cosmetic label.

The current map renderer is still Everwick specific. Remote townships are simulated and governed through the Government and Generations panels. Separate rendered maps for player founded towns are a future presentation layer, not required for the economic and migration simulation to function.
