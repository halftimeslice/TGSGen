# TGSgen — Refinement & Roadmap Backlog

> Single source of truth for outstanding work. Started 2026-07-09 after the first real AI TGS
> (Cosgrove Ave), expanded after reviewing real-world TGS templates and the Hennessy St output.
> Tick items as they land.

Tags: **[quick]** self-contained, low-risk · **[medium]** a real change, one area · **[deep]** big or needs design/decision.

---

## ✅ Done — 2026-07-09 session

- [x] **#7** Default works period = 1 day, starting tomorrow (`defaultWorkParams()`, `src/App.tsx`)
- [x] **#8** Enter commits/closes the open field (`blurOnEnter`, `src/components/Sidebar.tsx`)
- [x] **#6** "Start over" fully resets the TGS but keeps the address (`handleClear()`, `src/App.tsx`)
- [x] **#3** Sign pictures on the map + a Show Codes/Show Signs toggle; signs enlarged (42px) and
  co-located signs fan out so they don't stack (`src/components/TGSMapOverlay.tsx`, `src/App.tsx`)
- [x] **#2** Every non-route roundabout arm gets an explicit treatment — prompt + deterministic
  checker rule + arm geometry + render as "at roundabout" (`server/pipeline.mjs`,
  `server/checker.mjs`, `src/lib/osmFetch.ts`, `src/lib/aiGenerate.ts`, `src/components/Sidebar.tsx`)
- [x] **#11** Plainer, tradie-readable language in the prompt + plainer sidebar headings

---

## 🟢 Decided — ready to build (no blockers)

- [ ] **#5 Rebuild the TGS Diagram as the white schematic sheet** [deep] — DECIDED 2026-07-09.
  `src/components/TGSDiagram.tsx`. Target = the generic white-background professional style from the
  real templates: sign plates beside the road, dimension lines for spacing, green work-area polygon,
  orange cordon dots, legend, title block, notes block, north arrow, NOT TO SCALE. The **map view
  keeps the real aerial** — see the two-view split below.
- [ ] **#1 Zone bands/lines follow the real road** [medium]
  Bands sampled along the OSM centreline (`extendedPolyline`) in `src/components/TGSMapOverlay.tsx`
  via `src/lib/geometry.ts`. Mismatch is OSM centreline vs the real road on satellite. Snap-to-road / better sampling.
- [ ] **#4 Clean up the polygon selection tool** [medium]
  Red/green corridors in `src/components/LaneSideOverlay.tsx` + `src/lib/ringArcs.ts` — rough edges, worst at roundabouts.
- [ ] **#17 Aerial view export** [medium] — NEW.
  Council sometimes uses the aerial TGS onsite, so it's a real deliverable too. Today only the white
  diagram exports to PDF (`handleExportPdf`, `src/App.tsx`). Give the aerial view its own clean
  export with title/legend/notes so it stands alone.

## 🟡 Needs a decision from Zac

- [ ] **#9 Generation speed** [deep — DECISION NEEDED]
  Up to 3 sequential Opus-4.8 calls (1 generate + 2 checker-correction rounds). Levers, best first:
  fix checker failures **deterministically in code** instead of round-tripping the AI; lower
  **effort**; **Fast Mode**; **stream progress**. → Pending Zac's speed vs quality vs cost call.

---

## 🔴 Area E — AI design correctness (from Hennessy St review 2026-07-09)

> The checker only validates a handful of number-rules (taper/cone/TTL/advance distance, sign
> presence, side-road coverage). It does NOT check whether the layout is complete or symmetric.
> Fix = add rules to the checker (`server/checker.mjs`) + teach the prompt (`server/pipeline.mjs`).

- [ ] **#12 Control point at every approach / both ends** [medium]
  Alternating/STOP-SLOW jobs need a T5-2 STOP/SLOW at each end (TCAWS §4.2). Hennessy St had one end only.
- [ ] **#13 PREPARE TO STOP (T1-4) on the approach** [medium]
  Any controlled stop point needs a prepare-to-stop warning ahead of it, at a min setback ("MIN 30m to T/C").
- [ ] **#15 Speed-zone signage done properly** [medium]
  Reduced speed sign on the approach + return-to-normal ("END ROAD WORK – Return Speed X") at the exit.
- [ ] **#16 Fix the A-left / B-right side rule for one-direction jobs** [medium]
  `perpSide` in `src/components/TGSMapOverlay.tsx`. Mirror sides only for genuine two-way setups. Overlaps #14.
- [ ] **#14 END ROAD WORK lands on the far side at 0m** [medium] — PARKED (Zac: "leave it for now").
  Tagged approach B → map flips it across the road at 0m. One-direction job wants approach A at zone end.

---

## 🆕 New scenarios & rules from the real templates (2026-07-09)

> Extracted from ~10 real TGS/TCP plans (mix of VIC + NSW). These are the "written not tabled"
> rules the checker was missing. Best captured via a per-scenario reference doc, then rules + tests.

- [ ] **#18 Speed step-down on fast roads** [medium] — drop speed in stages (80→60→40), never one jump.
- [ ] **#19 Merge tapers for multilane/ramps** [deep] — MERGE RIGHT + merge taper + lateral-shift
  markers; distinct from the alternating single-lane taper we mostly model.
- [ ] **#20 Ramp scenario** [deep] — maintain ramp flow, TMA/crash truck, ramp signage class, buses
  given right of way. New scenario; Momentum M80/Burke Rd plans are the reference.
- [ ] **#21 Pedestrian/footpath scenario** [deep] — 1.5m min temp path, PEDESTRIANS WATCH YOUR STEP,
  bollard-separated route around the work area. Ruleset Part 13 exists but nothing enforces it.
- [ ] **#22 Richer side-road treatments** [medium] — SIDE ROAD CLOSED, DETOUR / DETOUR AHEAD,
  NO THROUGH ROAD, RESIDENT ACCESS, "ON SIDE ROAD" repeater plates. Extends #2's CONTROLLER/GIVE_WAY/CLOSURE.
- [ ] **#23 Cordon the work area as a polygon** [medium] — bollards/cones enclosing the green work
  area, not just zone lines.
- [ ] **#24 Signage realism** [medium] — repeater / duplicate ("mirror") signage; min setback from
  last sign to controller; realistic crew / TMA / arrow-board counts that scale with approaches.

---

## 🏗️ The flywheel — learning from real plans

- [ ] **Reference doc** — one page per scenario (roundabout / ramp / closure / pedestrian /
  stop-slow) listing the rules read off real plans, tagged "confident" vs "inferring". The spec for the above.
- [ ] **Test library** (PLAN Phase 9) — a few real *approved* plans as known-good targets to check
  every new version against.
- [ ] **Show-by-example** — when a job matches a stored one, hand the AI the closest approved plans as worked examples before it designs.
- [ ] **Field-feedback database** — save every plan made in-app in **structured form**, tagged (state,
  scenario, approved?), so the library builds itself. Curate for *approved*, not just *used*. Design
  the app to store structured plans + metadata from the start. Treat stored plans as sensitive
  (de-identify, consent) once there are real customers.

---

## 📋 Pre-existing, still open

- [ ] **PLAN Phase 8** — detour design for full closures (real plans: detour-as-a-route, per-arm END
  ROAD WORK, resident/emergency access — 1FIRST Calidonian Ave is the reference).
- [ ] **#10 Complex geometry** [deep, ongoing] — roundabouts w/ slip lanes, dual carriageways w/ shoulders.
- [ ] **Mobile works** generation — deferred post-v1.

---

## The two views (locked 2026-07-09)

- **Map View** — the coloured overlay (signs, zones, work area) on the **real aerial image**. The
  "where exactly on the road" view; sometimes used onsite, so needs its own export (#17). Keep + refine.
- **TGS Diagram** — the formal printable document: **white schematic** road drawing, not imagery
  (#5). The house style from the real templates.

## Open questions for Zac

- **#9 speed:** how much quality/cost to trade for speed?
- Which sent plans are **gold-standard** vs just typical?
- Rough **job mix** you do most (residential lane closures? roundabouts? ramps?) — sets build priority.
