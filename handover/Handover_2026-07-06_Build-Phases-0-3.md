# TGSgen — Handover Note (2026-07-06, build session)

## Where things stand

**Build officially started.** Branch `ai-generation` (main = pre-AI fallback). Phases 0–3 built and committed:

- **Phase 0** — snapshot committed, junk deleted (`tmp_extract/`, `untitled folder/`, `dist/`)
- **Phase 0.5** — roundabout routing fixed: pins on two arms now stitch through the ring in travel direction (`stitchViaRoundabout` in osmFetch.ts). Old Roundabout mode/clickable sections removed. Overpass calls now retry across 3 mirror endpoints (public servers 406/429/504 under load — this was why arm data silently failed in Zac's browser test). Zac verified routing works in browser.
- **Phase 1** — closure details form (work type, road/footpath/both, mobile toggle, TGS number, engineer name) in Sidebar.
- **Phase 2** — helper server (`npm run server`, port 8787, plain node:http). POST /api/generate → Claude `claude-opus-4-8` via `@anthropic-ai/sdk`, adaptive thinking, streaming, structured output (server/tgsSchema.mjs), prompt caching (rulebook+catalog cached system blocks). Provider swap = one file (server/providers/claude.mjs); mock provider exists (`TGS_PROVIDER=mock`). Vite proxies /api → 8787.
- **Phase 3** — Generate button calls the AI end-to-end; aiGenerate.ts converts schema output → TGSResult for existing renderers. tgsEngine.ts deleted (retired). Side-road treatments read-only until Phase 5. Mock provider verified end-to-end via curl; Zac had the browser open when session ended.

## IN PROGRESS (spec agreed, started — stopped on Zac's instruction 2026-07-07)

**Done so far:** `RingInfo` type added to types.ts; `stitchViaRoundabout` in osmFetch.ts now computes and returns `ring: RingInfo` (nodes, center, entryIdx, exitIdx) in its result. NOT yet done: `fetchRoadData` doesn't expose `ring` in `OsmFetchResult`, App doesn't store/pass it, LaneSideOverlay untouched, RoundaboutOverlay (blue band) not yet deleted, aiGenerate payload unchanged. Code committed as WIP — typechecks, app behaviour unchanged.

**Flowing roundabout selection corridors** (Zac's screenshots, spec confirmed):
- Red/green corridors continue THROUGH roundabouts as FILLED, each colour ONE continuous smooth polygon pin-to-pin (no segment seams)
- Colours split around the central island and rejoin (turns: one colour short arc, other sweeps the long way; each colour stays continuous with its side on both arms, never crossing)
- Blue detection band REMOVED entirely (delete RoundaboutOverlay); "Roundabout Detected" sidebar panel stays
- Other ring arms inside closed sweep: default CLOSED, engineer decision later; AI payload to carry closed ring arc + defaultClosed arm flags

Plan: stitchViaRoundabout returns full RingInfo {nodes, center, entryIdx, exitIdx} (type already in types.ts) → App state → WorkZoneMap → LaneSideOverlay rework (assemble boundary chains: arm centreline/kerb + ring-arc radial offsets ±w/2, join by nearest-endpoint pairing, Catmull-Rom smooth, one polygon per side, clickable) → shared arc-split helper (lib) reused in aiGenerate for defaultClosed flags. Arc→side assignment via cross product at entry heading; verify visually with Zac and flip if inverted.

## Blockers / waiting on Zac

- **Anthropic API key still missing.** Walkthrough given: console.anthropic.com → Billing ($5) → API Keys → create → paste into `.env` after `ANTHROPIC_API_KEY=` (line already prepared). Browser-only, no terminal. Until then run helper server with `TGS_PROVIDER=mock`.
- First real generation test (Cosgrove Avenue, 60m, 1 lane, daytime, 3 days → expect stop/slow) once key exists.

## Session housekeeping

- Dev server now on **5173** (I killed the leftover SportsIT vite process that squatted there — tell Zac's next session it starts fresh). Helper server was running in mock mode. Both die with session.
- Remaining phases: 4 checker+retry, 5 editable TGS, 6 PDF, 7 rulebook 2nd pass, 8 detour+mobile, 9 test library.

## Behavioural notes

- Zac: plain language, no jargon, never terminal. Ask at genuine forks, don't assume ("make no mistakes").
- Overpass testing from Node: overpass-api.de blocks Node's fingerprint — use kumi/private.coffee mirrors with a real UA, or curl.
