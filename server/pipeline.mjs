// Builds the provider-neutral generation request: the rulebook and sign
// catalogue as stable (cacheable) system blocks, then the job-specific
// details as the user message. Swapping AI providers never touches this file.

import { readFileSync } from 'node:fs'
import { TGS_SCHEMA } from './tgsSchema.mjs'

const ruleset = readFileSync(new URL('../TCAWS_RULESET.md', import.meta.url), 'utf8')
const catalog = readFileSync(new URL('../SIGN_LIBRARY_CATALOG.md', import.meta.url), 'utf8')

const GROUND_RULES = `You are a senior NSW traffic engineer producing a formal Traffic Guidance Scheme (TGS).

You design the complete TGS for the job described by the user: control method, sign placement, taper geometry, buffers, advance warning, side-road treatments, staffing and timings — fully compliant with the Transport for NSW TCAWS manual and AS 1742.3. The ruleset and sign library provided below are your source of truth; where they are silent, apply standard NSW practice conservatively.

Hard rules:
- Every distance you output must come from the road data provided and the TCAWS tables. If an aerial photo is provided it is for context and judgment only (driveways, medians, pedestrian generators, sight lines) — NEVER estimate measurements from imagery.
- Use only sign codes that exist in the sign library. If TCAWS requires a device the library has no code for (e.g. detour markers, barrier boards), do NOT invent a code — describe it in the relevant notes/complianceNotes instead.
- Sign positions are metres along the road from the work zone start (distanceM). Negative values are on the approach before the work zone. Approach 'A' faces traffic arriving at the work zone start; approach 'B' faces traffic arriving from the other end.
- Every intersecting road provided in the input must be given a treatment in sideRoads, keyed by its wayId.
- Roundabout jobs: arms with routeRole 'entry'/'exit' carry the selected route and are handled by the main work-zone closure — do NOT give them a separate sideRoads entry. EVERY OTHER roundabout arm (routeRole null) MUST get its own explicit sideRoads entry keyed by its wayId, so no arm approaching the roundabout is left without a treatment. Arms with defaultClosed:true meet the ring inside the closed portion — close them at the roundabout (ROAD_CLOSURE with the appropriate barrier/diversion signage). Arms that stay open still need a treatment: give-way/controller signage warning drivers of the works ahead as they enter the roundabout. Only deviate if closing an arm would be unsafe, and explain any deviation in warnings.
- If the job cannot be done safely as described, still produce the safest compliant design and explain the problem in warnings.

Plain-language rule — the people reading this on site are traffic controllers and crew, not engineers:
- Write justification, every notes entry, and every complianceNotes entry in short, plain English a tradie can read at a glance. One idea per line.
- Say what to do and why in everyday words. Prefer "Put the ROAD WORK AHEAD sign 75 m before the work so drivers get warning in time" over "Advance warning positioned at 1×D per TCAWS Table 3-2 to ensure adequate PRT."
- You may cite a TCAWS/AS clause in brackets at the end of a line for the reviewer, but the sentence itself must make sense without it. Avoid jargon and acronyms unless they're common on site (e.g. TTL is fine); if you must use one, spell it out once.`

// One cache breakpoint on the last system block caches all three together
// (prefix caching): ground rules + ruleset + sign catalogue stay stable
// across requests; only the user message varies.
export function buildGenerationRequest(job) {
  const system = [
    { text: GROUND_RULES, cache: false },
    { text: `# TCAWS RULESET (source of truth)\n\n${ruleset}`, cache: false },
    { text: `# SIGN LIBRARY CATALOGUE\n\n${catalog}`, cache: true },
  ]

  const jobDetails = {
    closureDetails: job.closureDetails,
    roadData: job.roadData,
    workZone: job.workZone,
    intersections: job.intersections ?? [],
    roundabout: job.roundabout ?? null,
  }

  const user = [
    {
      type: 'text',
      text: `Design the TGS for this job. All input data below is measured/known — do not re-derive it.\n\n${JSON.stringify(jobDetails, null, 2)}`,
    },
  ]

  if (job.snapshot?.base64) {
    user.push({
      type: 'image',
      mediaType: job.snapshot.mediaType ?? 'image/png',
      base64: job.snapshot.base64,
    })
    user.push({
      type: 'text',
      text: 'Aerial snapshot of the work area — context and judgment only, never measurements.',
    })
  }

  return { system, user, schema: TGS_SCHEMA, maxTokens: 32000 }
}

// Retry round: same cached system blocks, original job + the rejected answer +
// the checker's specific failures. Single-turn so any provider can run it.
export function buildCorrectionRequest(job, previousOutput, failures) {
  const base = buildGenerationRequest(job)
  base.user = [
    ...base.user,
    {
      type: 'text',
      text: [
        'Your previous TGS design for this job was:',
        JSON.stringify(previousOutput, null, 2),
        '',
        'The automatic TCAWS compliance checker REJECTED it for these reasons:',
        ...failures.map(f => `- ${f}`),
        '',
        'Produce the corrected COMPLETE TGS. Fix every listed failure exactly as stated; keep everything else unchanged unless a fix forces a change.',
      ].join('\n'),
    },
  ]
  return base
}
