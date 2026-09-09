# Everwick Appearance Economy

## Design rule

A citizen receives identity once. Later cosmetic changes participate in the same conserved economy as food, tools, rent, wages, and other goods.

## Shops

| Business | Service | Map tile | Price model |
| --- | --- | --- | --- |
| Shear & Comb | Haircuts and hair dye | 13,19 | 80 coins per hair style change, 60 per dye change |
| Needle & Thread | Tops and legwear | 13,28 | 120 coins per top, 90 per legwear item |
| Last & Sole | Shoes | 20,37 | 75 coins per pair |
| Gilded Finch | Jewelry | 27,37 | 160 coins per jewelry item |

The controlled citizen must be physically near the relevant shop for a purchase or barber service. The shop must be open and stocked.

## Money and stock

Every paid appearance transaction moves existing coins from the citizen account into the shop business account. The transaction consumes one unit of the shop's goods supply. Shops can acquire replacement goods through the existing trade and restocking systems. No cosmetic transaction creates currency.

## Wardrobe ownership

Each citizen owns a persistent wardrobe. Purchasing an item adds a normalized wardrobe key for that item and immediately equips it. Re equipping an already owned item is free and may happen anywhere. A citizen cannot equip an item that is not in their wardrobe.

Existing saves receive ownership of the outfit currently being worn at migration time. They do not receive the entire catalog for free.

## Genetics

Skin tone, natural hair color, eye color, and body frame remain inherited identity traits. Adult shops cannot modify those values. Hair style and dyed hair color are cosmetic.

The newborn design window remains free and limited to inherited options because it establishes the child's initial identity rather than purchasing a later cosmetic service.

## LPC layers

Everwick currently renders body, legwear, shoes, torso, head, eyes, eyebrows, optional jewelry, and hair. Hair remains the final layer so compatible hairstyles render over the face stack.

## Physical counter rule

The Style tab is a wardrobe only. It never exposes purchase forms or barber controls. Owned tops, legwear, shoes, and jewelry can be equipped from Style at any location for no charge.

New items and hair services are only exposed at the matching business counter when the active citizen is physically within interaction range of that shop. Opening a shop remotely shows directions instead of transaction controls. Server commands independently enforce the same distance check, so bypassing the client interface cannot purchase or alter cosmetics from afar.
