# TGSgen — Handover Note (2026-07-07, session 2)

## Committed this session

- **Phase 7 complete** (`2418318`) — TCAWS_RULESET.md v2.0: Parts 12–17 (Dimension D to 110 km/h,
  full taper Table 7-3, sign spacing Table 6-3, ≥30 m safety buffer §7.6.2.3, speed-zone lengths
  Table 4-10, sight Table 7-9; footpaths per TD 00003 (1 m/2 m), cyclists; closures + detours;
  intersections/signals; shoulder/verge + single-lane operation; mobile/dynamic works).
  checker.mjs enforces the new taper bands (control vs merge column via controlMethod), 30 m buffer,
  zone lengths. Verified: mock passes at 50/70/100/110; hand-broken 90 km/h TGS → 3 correct failures.
  ⚠ T1-6 clash unresolved: TCAWS = DETOUR AHEAD, app catalogue = lanes-merge pictogram (Phase 8).
  Pipeline ground rule: AI must never invent sign codes; describe missing devices in notes.
- **Mobile works deferred to post-v1** (`1e5eff7`, PLAN.md) — Zac's call; Phase 8 = detour design only.
- **Gemini provider** (`bb3dfe5`) + **Groq provider** (`5bec5f5`) — server auto-picks by key:
  claude > gemini > groq > mock (TGS_PROVIDER forces; TGS_GEMINI_MODEL / TGS_GROQ_MODEL override).

## THE BLOCKER — no working AI key yet (pinned here, Zac had to go out)

1. **Anthropic**: credit purchase form broken for Zac's account — tax/total stuck at `$--` on desktop
   AND phone, address definitely filled, no outage. Untried: retry later, different card, support ticket.
2. **Gemini**: Zac's AI Studio only issues new `AQ.`-format keys and they 401 UNAUTHENTICATED on the
   native endpoint (key length 53, tested ?key= / x-goog-api-key / Bearer, v1 + v1beta). Verified via
   web: AQ is the new official format, but some accounts' AQ keys genuinely fail (Google-side).
   **Fix path A:** key from a DIFFERENT Google account → paste into .env GEMINI_API_KEY.
3. **Groq**: built and ready, Zac hasn't signed up yet. **Fix path B:** console.groq.com/keys → key
   starts `gsk_` → .env GROQ_API_KEY. After a Groq key lands, verify TGS_GROQ_MODEL: default is
   llama-3.3-70b-versatile — list https://api.groq.com/openai/v1/models with the key and pick the
   strongest available (prefer newer Llama 4 / Kimi if present, must support json_object + vision
   ideally). For Gemini likewise: ListModels then set TGS_GEMINI_MODEL (default gemini-2.5-pro).

**Next action when a key exists:** restart helper server (no TGS_PROVIDER env), `/api/health` shows
the picked provider, then FIRST REAL GENERATION: Cosgrove Avenue Flinders, 60 m, 1 lane closed,
daytime, 3 days → expect stop/slow bat. Compare with checker output; then Zac eyeballs in browser.

## Also still owed by Zac

- Visual check of flowing roundabout corridor colours (flip `travelArcOnLeft` usage if inverted).

## Housekeeping

- Servers were running (die with session): `npm run dev` (5173), helper on 8787 (mock). Restart both.
- Groq/Gemini key pages were left open in his browser; .env has empty ANTHROPIC_API_KEY= and
  GROQ_API_KEY= lines, GEMINI_API_KEY= holds the rejected AQ key (harmless).
- Remaining: Phase 8 detour design, Phase 9 test library. Memory file `project_provider_status.md`
  tracks the provider saga.

## Behavioural notes

- Zac: plain language, never terminal, ask at genuine forks. He was (rightly) annoyed when I assumed
  he'd copied the wrong Gemini key — the AQ format was real and newer than my knowledge. Verify
  against the live web before doubting what he reports seeing.
