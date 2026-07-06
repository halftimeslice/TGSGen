# TGSgen — Handover Note (2026-07-06)

## What we did today

**Planning only — no build code written. The build has still NOT started; Zac will say when.**

1. **Roundabout selection redesigned (Zac's call):** NO separate roundabout mode, NO clickable ring sections. Roundabouts are selected with the same start/end pin polyline tool as ordinary roads; the app auto-detects a roundabout on the path and hands its full layout (arms, lanes, speeds, geometry) to the AI, which designs the closures. Supersedes the old section-closure model. PLAN.md + memory updated.

2. **Bug found while testing in browser:** pins placed on two arms of a roundabout don't connect through it — the polyline snaps back to the roundabout entry. Cause: the way-stitching in `fetchRoadData` ([osmFetch.ts:284](../src/lib/osmFetch.ts)) only joins two roads that share a node; roundabout arms never touch each other (they touch the ring). Falls back to start-way-only at [osmFetch.ts:300](../src/lib/osmFetch.ts). Fix = new stitch case: route along the ring (one-way direction) when both roads connect to it. Logged as **Phase 0.5** in PLAN.md Build Order, bundled with removing the old roundabout mode + `closedSegments`/section UI.

3. **AI provider question answered:** Zac asked if free Gemini API would suffice. Decision: stay with Claude for generation, but the helper server gets a **swappable provider interface** (one-file change to switch). Checker + test library stay provider-neutral so any comparison is score-based. Cost expectation set: ~10–40 cents per generated TGS, less with prompt caching.

4. **Task list confirmed with Zac** (11 items, see PLAN.md §Build Order). He asked if it can all be done in one hit — answer given: one long run builds everything end-to-end, but pauses needed for (a) his Anthropic API key, (b) his judgement on output quality, (c) real approved TGSs for the test library.

## Open items / blockers (unchanged + new)

- **Zac still has no Anthropic API key** — browser-only setup at console.anthropic.com; walk him through click-by-click, never terminal.
- Uncommitted changes still sitting on `main` (TGSMapOverlay.tsx, tgsEngine.ts, PLAN.md, CLAUDE.md untracked, handover notes) — tidy/commit before branching in Phase 0.
- Rulebook second extraction pass still pending (pedestrians, mobile works, detours, high-speed tables, intersections).

## Session housekeeping

- TGSgen dev server (was on port **5174**) stopped at session end. Note: Zac's SportsIT project had a leftover Vite server squatting on 5173 — untouched, but expect the port clash again.

## Behavioural notes

- Don't ask "ready to start?" — Zac says when the build begins.
- Plain language, no jargon (project CLAUDE.md). Zac finds the terminal hard — never ask him to run commands.
