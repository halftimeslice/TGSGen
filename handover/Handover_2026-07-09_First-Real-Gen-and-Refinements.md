# TGSgen — Handover Note (2026-07-09)

## Headline: the blocker is dead — Claude is working

Zac pasted a working `ANTHROPIC_API_KEY` into `.env`. Live-tested against the API →
**HTTP 200, real reply on `claude-opus-4-8`**. The multi-session dead-key saga (Anthropic
billing / Gemini `AQ.` 401 / Groq unused) is over. The helper server auto-picks Claude when the
key is present (`server/index.mjs` `pickProvider()`), confirmed on boot:
`Provider: Claude (claude-opus-4-8)`. Gemini/Groq providers stay in the tree as fallbacks but
aren't needed. Memory `project_provider_status.md` updated to RESOLVED.

## First real generation happened

Zac ran a real job in the browser (Cosgrove Ave + a roundabout). It "kind of works" — a genuine
AI TGS rendered on the map. This kicks off the refinement phase (Phases 8–9 of PLAN.md still
pending separately: detour design, test library).

## What this session produced (docs only — NO app code changed)

- **`REFINEMENTS.md`** (repo root) — the living refinement backlog, 11 items Zac brain-dumped
  after reviewing the first output, sorted into the four areas (map/selection, AI accuracy,
  diagram look, closure form), tagged quick/medium/deep, with an execution order.
- **This handover.**

Zac approved the plan but explicitly wanted to **pause before any implementation**. No source
files were touched this session.

## The 11-item backlog (see REFINEMENTS.md for detail + file pointers)

Quick wins (Batch 1, do first): **#7** default works period = 1 day/tomorrow · **#8** Enter closes
dropdowns · **#6** "Clear work zone" → full reset but keep address · **#3** show sign pictures
(reuse existing `SignIcon`) instead of codes, with a codes toggle.

AI correctness/plain-language (Batch 2): **#2** roundabout non-selected arms get no treatment (must
sign/close every arm) · **#11** Phase/Intersecting/Justification/Compliance sections → plainer,
tradie language.

Geometry (Batch 3): **#1** zone bands don't follow the road (OSM centreline vs satellite) ·
**#4** polygon selection tool rough · **#10** complex geometry (slip lanes, dual carriageways) — deep/ongoing.

Diagram redesign (Batch 4): **#5** rebuild TGS diagram toward industry-standard plan style.

## Two decisions owed by Zac before their items can be built

1. **#9 Generation speed** — today it's up to 3 sequential Opus-4.8 calls (generate + 2 correction
   rounds). Can be cut a lot (deterministic checker fixes, Fast Mode, lower effort, streaming) but
   not to "instant". Needs his speed vs quality vs cost call. Best done alongside Batch 2.
2. **#5 Diagram target style** — his reference was a Google-images montage; needs one concrete
   target chosen before the redesign.

## Resume point

Servers were left running (die with the session): app `npm run dev` (5173), helper `npm run server`
(8787, Claude). Restart both. When Zac says go, **start with Batch 1** (#7, #8, #6, #3 — all in
`App.tsx`, `Sidebar.tsx`, `TGSMapOverlay.tsx`), then reload the browser and re-run the Cosgrove Ave +
roundabout job to eyeball. Approved plan also saved at `~/.claude/plans/radiant-noodling-dusk.md`.

Nothing is committed — Zac commits/pushes only when he asks.

## Also still outstanding (pre-existing, from prior handover)

- PLAN.md Phase 8 (detour design) + Phase 9 (test library — needs real approved TGS examples from Zac).
- Visual check of the flowing roundabout corridor colours (flip `travelArcOnLeft` usage if inverted)
  — overlaps with refinement #4/#10.
