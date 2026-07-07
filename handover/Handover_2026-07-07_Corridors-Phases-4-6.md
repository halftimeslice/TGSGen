# TGSgen — Handover Note (2026-07-07, build session)

## Where things stand

Branch `ai-generation`, working tree clean, all work committed. This session finished the
flowing roundabout corridors, built **Phases 4, 5 and 6**, and fixed an Overpass hang.
**Phase 7 (rulebook second pass) is mid-flight** — see below for exactly where to resume.

## Committed this session

- **Flowing roundabout corridors** (`06c613e`) — red/green selection bands are now ONE
  continuous smooth polygon per side, pin-to-pin, splitting around the central island and
  rejoining (spec from Zac's screenshots, 2026-07-06 handover). Blue detection band /
  RoundaboutOverlay deleted; "Roundabout Detected" sidebar panel stays.
  - New `src/lib/ringArcs.ts`: `ringArc()` (travel/far arc), `travelArcOnLeft()` (cross
    product at entry heading), `classifyArm()`, `offsetFromCenter()`. Shared by
    LaneSideOverlay (drawing) and aiGenerate (flags) so they always agree.
  - `RingInfo` now carries `entryWayId`/`exitWayId`; exposed via `fetchRoadData` → App
    state → WorkZoneMap → LaneSideOverlay.
  - AI payload: roundabout arms get `routeRole` ('entry'/'exit'/null) and `defaultClosed`
    (true when the arm meets the ring on the closed side's arc). Ground rule added in
    pipeline.mjs telling the AI what defaultClosed means.
  - **NOT yet visually verified by Zac** (Overpass outage interrupted his test). The
    arc→side assignment is geometry-computed and was verified analytically, but the plan
    was always: check with Zac and flip if inverted. Ask him next time the app is open.
- **Phase 4: automatic checker + correction loop** (`a9a6a36`) —
  - `server/checker.mjs` `checkTGS(tgs, job)` → array of failure strings written FOR the
    AI (rule + offending value + required value). Checks: D formula, control method vs
    speed (manual >65 banned, PTCD >85 mandatory, flashing arrow >85), taper minimums,
    cone spacing bands, advance warning distance/spacing/levels, 1D end buffer, speed
    zone required when taper >60 m (+T1-3 sign present), workZoneLength must match the
    measured selection ±10%, TTL eligibility (≤7 days, ≤75 km/h) and timing arithmetic,
    personnel, sign codes vs `KNOWN_SIGN_CODES`, mandatory T1-1 approach A + T1-10,
    T5-2 present for bat ops, every intersection covered in sideRoads.
  - Loop in `server/index.mjs`: generate → check → `buildCorrectionRequest()` (same
    cached system blocks, original job + rejected JSON + failure list) → re-check, max 2
    correction rounds. Still failing → ships with `COMPLIANCE CHECK FAILED:` warnings.
    Passing → complianceNotes gets "Automatic TCAWS check: passed". Response includes
    `checker: { passed, correctionRounds, failures }` (frontend doesn't read it yet).
  - Mock provider rewritten to emit table-compliant values (incl. >75 km/h branch where
    TTL is ineligible) so the whole loop tests clean without a key. Verified via curl:
    passed=true, and a hand-broken TGS produced 9 correct failures.
  - ⚠ `KNOWN_SIGN_CODES` in checker.mjs mirrors what SignIcon.tsx can draw — if signs
    are added to SignIcon, update the checker set (and vice versa).
- **Phase 5: editable TGS** (`6186980`) — signs carry stable `id`s (`ai-N` at load,
  `user-<ts>` for added). Map markers draggable (live distance label while dragging,
  snaps back to road via `distanceAlongPolylineM` on release), click → select → red ×
  deletes. Sidebar "6. Edit TGS": add-sign palette (`src/lib/signPalette.ts`, curated
  codes SignIcon can draw; new signs drop at WZ start, approach A) + "Reset to AI
  version" (App keeps `aiTgsResult` alongside edited `tgsResult`). Side-road signs are
  NOT editable yet (deliberate scope cut). Sidebar list + diagram update live.
- **Phase 6: PDF export** (`2b5a895`) — green Export PDF button beside the view toggle;
  auto-switches to diagram view if needed. `src/lib/pdfExport.ts` rasterizes the diagram
  SVG (≥2500 px wide) onto landscape A4 via jsPDF (new dependency). TGSDiagram's
  foreignObject sign icons replaced with nested SVG so rasterization works everywhere;
  svg now has `id="tgs-diagram-svg"`. Filename from TGS number, falls back to road name.
  Diagram is dark-themed; a white "formal drawing" theme is a possible later refinement.
- **Overpass hang fix** (`1472bce`) — all mirrors went down mid-session and the app spun
  on "Fetching road data…" forever. Now: 12 s timeout per attempt, 4th endpoint
  (lz4.overpass-api.de), honest sidebar error with retry instructions. Zac hit this live;
  service recovered ~19:30. If road data errors appear, it's the public servers — wait a
  minute, nudge a pin.

## IN PROGRESS: Phase 7 — rulebook second pass

Goal: extend `TCAWS_RULESET.md` (pipeline.mjs sends the whole file to the AI
automatically — no code change needed) with: footpaths/pedestrians, mobile works,
detours, high-speed 80–110 tables, intersection treatments, shoulder/verge/kerbside.

**Done so far:** text extracted from all 4 PDFs with
`pdftotext -layout "TCAWS/TS 05492...part-N.pdf" <out>.txt` (pdftotext is installed at
/opt/homebrew/bin; extractions were in the session scratchpad — **re-run the command**,
outputs die with the session). Sections located and read:

| Topic | Where (post-extraction) | Status |
|---|---|---|
| Pedestrians/footpaths | part1 §4.4.2 (~line 3939) + **TD 00003 amendment replaces the Footpaths row of Table 4-4** (part1 ~line 78) | Read, ready to write |
| Cyclists | part1 §4.4.3 (~line 4046): 1.2 m min shoulder, 2 m if >60 km/h | Read |
| Road closures | part3 §7.7.2.2 (~line 59): T2-4 + barrier boards, progressive lane closure, mirrored closure across intersections, local access options | Read |
| Detours | part3 §7.7.2.3 (~line 107): DETOUR AHEAD + first marker ≤100 m after, marker orientations; side tracks §7.7.2.4 | Read |
| Mobile/dynamic works | part3 §7.8 (~line 515–834): work types, Table 7-6 principles, Table 7-7 convoy vehicles (shadow 20–40 m behind, advance warning vehicle ~1 km, not required <65 km/h with 2D sight), §7.8.3 frequently-changing criteria (<65 km/h in-lane, 20 min/1 hr location limits, <20 vpd no-warning exception), §7.8.3.1 min controls (signs ≤2 km ahead, T1-5/T1-3-1 + T1-28), §7.8.3.2 <1500 vpd no-shadow-vehicle rules (1.5D sight, ≤2 plant, <85 km/h, 1.5 m clearance, 2 km subsections, T1-24, surface-condition signs), §7.8.3.3 verge/median/footway clearances, §7.8.3.4 slow plant piloting (2D/6D rules) | Read |
| High-speed distance tables | part2 §4.5 speed zones region + appendices | **NOT yet located — next step** (grep for 'dimension d'/Table 4-x was pending when session paused) |
| Intersection treatments | part3 §7.7.3+ "Past TTM methods" onward | NOT yet read |
| Shoulder/verge/kerbside static | part3 §7.7 static work area; part4 Appendix D layouts (D.4.19 shoulder work) | NOT yet read |
| Sight distance Table 7-9 | part3, referenced repeatedly | NOT yet read |

**⚠ Sign-code clash found:** TCAWS part3 names DETOUR AHEAD as **T1-6**, but the app's
catalogue/SignIcon use T1-6 for the lanes-merge pictogram. Resolve during Phase 7 (check
SIGN_LIBRARY_CATALOG.md, likely add a distinct detour-ahead entry) — and remember any new
sign codes need BOTH a SignIcon renderer and a checker.mjs KNOWN_SIGN_CODES entry.

**Plan for the write-up:** append new numbered Parts to TCAWS_RULESET.md mirroring its
existing style (tables + hard thresholds, with TCAWS section references). Then extend
checker.mjs where new deterministic rules exist (e.g. footpath ≥1 m constriction / 2 m
elsewhere if AI outputs footpath widths; mobile-works eligibility). Keep AI-checkable vs
judgment rules separate.

## Blockers / waiting on Zac

- **Anthropic API key still missing** (.env has the empty `ANTHROPIC_API_KEY=` line).
  Until then helper server must run with `TGS_PROVIDER=mock`.
- First real generation test (Cosgrove Ave, 60 m, 1 lane, daytime, 3 days → expect
  stop/slow) once the key exists.
- Visual check of roundabout corridor colours (flip `travelArcOnLeft` usage if wrong).

## Session housekeeping

- This session ran `npm run dev` (5173) + `TGS_PROVIDER=mock npm run server` (8787) in
  background — both die with the session; restart them next time.
- `npm install jspdf` happened this session (package.json/lock committed).
- Remaining phases after 7: **8 detour design + mobile works generation, 9 test library
  + tuning.**

## Behavioural notes

- Zac: plain language, no jargon, never terminal — Claude runs everything.
- Ask at genuine forks ("make no mistakes"); routine mechanics don't need asking.
- Public Overpass servers are flaky: browser calls now have timeouts; from Node/curl use
  the kumi/private.coffee mirrors or expect 406 from overpass-api.de.
