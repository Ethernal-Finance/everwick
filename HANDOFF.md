# Everwick Agent Handoff Log

This file is the shared handoff log for humans and AI agents working on Everwick.

Read `AGENTS.md` first.

## Instructions

After completing significant work, add a NEW entry at the TOP of the Agent Handoff History below.

Do not delete previous entries.

Each entry should contain:

- Date/time
- Agent or tool name if known
- Task
- Files changed
- Commit
- Tests performed
- Build result
- Deployment result
- Known issues
- Recommended next steps

If something failed, document the failure instead of hiding it.

---

# Current Project State

**Branch:** `main`

**Development mode:** Active build phase. Changes may be deployed directly to live.

**Source repository:** `Ethernal-Finance/everwick`
**Canonical source of truth:** GitHub `Ethernal-Finance/everwick` branch `main`

The VPS is not authoritative. Any change that is not committed and pushed to GitHub is considered incomplete and must not be deployed as permanent source.
**Authoritative source directory:**

`/opt/everwick-work/everwick`

**Important:** Read `AGENTS.md` before modifying the project.

---

# Agent Handoff History

## 2026-09-11 — Dungeon movement responsiveness

**Agent:** Cursor Grok
**Task:** Fix laggy / barely-movable dungeon controls on the live site.

**Root cause:** Each WASD dungeon step called `act()` with `busy=true`, waited for `/api/command`, then reloaded the entire `/api/world` payload and re-rendered the panel. Held keys and touch arrows were dropped while busy.

**Files changed:**
- `client/game.js` — queued dungeon moves; apply command result to `world.player.dungeonRun`; full world refresh only when a run ends
- `client/map-renderer.js` — cache fog-of-war Set; drop per-tile dungeon sprite/stroke work
- `server/dungeon.mjs` — incremental reveal without rebuilding the discovered array every step
- `docs/DUNGEONS.md`

**Tests / build:** full suite 154 pass; build OK.
**Deployment:** not deployed yet.

## 2026-09-09 — Town layout and building rendering cleanup

**Agent:** Cursor Grok 4.6
**Task:** Everwick Centre visual correctness and rendering-efficiency pass. No gameplay features, no record deletion, no push/deploy.

**Files changed:**
- `client/world-map.js` — Centre coordinates, MAP.version 6, footprints, viewport helper, TREE_CLEAR
- `client/scenery.js` — unique landmark sprites; planters no longer cover doors
- `client/map-renderer.js` — viewport culling, roof padding, no per-tile occupier arrays
- `client/map-validation.js` — layout/sprite validation utility
- `client/chapter.js`, `client/content.js`, `server/chapter.mjs`, `server/appearance.mjs`, `server/movement.mjs` — dest/shop coords follow the map
- `tests/map-layout.test.mjs`, `tests/chapter.test.mjs`

**Layout:** Moved watch, hall, mine, inn, market, workshop, garden off roads. Extended the y=13 ridge path to x=47. Taller farm/mine collision. Unique 64/80px sprites for shops and civic buildings.

**Rendering:** Static buildings culled with 8-tile roof pad. Spawn drawable buildings 61 → 19. TREE_CLEAR O(1) instead of spreading every world structure per tree tile.

**Tests:** Full suite 148 pass (baseline 146). Build OK. Local `/api/town-preview` served migrated coords. No browser MCP; visual pass was deterministic validation only.

**Deployment:** Not pushed, not deployed.

**Known issues:** Bramble Close cottages south of y=20 sit on lawn, not cobble (allowlisted as lawn lots). 64px landmark art is still small village houses, not unique large buildings. No in-browser zoom/mobile screenshot this pass.

**Next:** Visual check at normal and town-overview zoom on desktop and mobile after push/deploy. Consider dedicated large landmark art later.

## Initial Git Collaboration Setup

**Task:** Establish shared Git/GitHub workflow for Everwick.

**Completed:**

- Existing Everwick source imported into Git.
- `main` established as primary branch.
- GitHub remote configured.
- VPS authenticated to GitHub using an SSH deploy key.
- `main` configured to track `origin/main`.
- `AGENTS.md` added with AI collaboration rules.
- README updated to direct AI agents to `AGENTS.md`.

**Important commits:**

- `c286816` — Initial Everwick source import
- `9230b01` — Add AI collaboration and commit rules

**Repository state:** Git/GitHub collaboration system operational.

**Next agents:** Preserve existing work, follow `AGENTS.md`, commit coherent changes, push completed commits, and leave handoff information here.
