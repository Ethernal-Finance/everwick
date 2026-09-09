# Art provenance

Everwick uses the user's supplied Fantasy Dreamland packs by **ElvGames**. The original archives remain untouched in `C:\Users\Glob\Documents\Astra6\itch-rpg-assets`.

Integrated packs:
- Village – Fantasy Dreamland: buildings, grounds, doors, signs, furniture and props.
- Forest – Fantasy Dreamland: foliage, terrain and ambient environment art.
- Mountains and Grasslands – Fantasy Dreamland: mining ridge, rock formations, farmland details and vegetation.
- Character Sprites 1 – Fantasy Dreamland: forty 24×24-frame character sheets representing 100 citizens through reuse.

Source images are copied intact into `client/assets/dreamland` as an integral part of the game. The town layout, scaling and compositions are custom. `client/assets.js` maps frames and files, so art can be changed without changing economic state. Pixel smoothing is disabled. Art is not sent to language-model providers or used for model training/generation.

The license bundled in `Fantasy Dreamland World.zip` permits personal/commercial projects with ElvGames credit, forbids asset-pack resale, and forbids crypto/NFT-related projects. The user explicitly chose to drop blockchain to use these packs. Wallet and blockchain code were removed. The game contains only internal currency.

Retain purchase records with the company's records. Do not distribute these files as a standalone asset pack or publish the source repository publicly with paid assets. Game distributions should retain credits and the license notice.

Full terms: https://elvgames.itch.io/terms


## Dungeon artwork

The Copperhill Catacombs feature uses the user supplied Dungeon Fantasy Dreamland pack. Everwick uses the dungeon tile sheet already present in the stable art set and adds the matching dungeon door sheet for entrances and exit gates. These assets are used only inside the dungeon renderer, so the stable overworld tile mapping is not changed.
