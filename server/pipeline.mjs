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
- Use only sign codes that exist in the sign library.
- Sign positions are metres along the road from the work zone start (distanceM). Negative values are on the approach before the work zone. Approach 'A' faces traffic arriving at the work zone start; approach 'B' faces traffic arriving from the other end.
- Every intersecting road provided in the input must be given a treatment in sideRoads, keyed by its wayId.
- If the job cannot be done safely as described, still produce the safest compliant design and explain the problem in warnings.
- justification must be plain language a reviewing engineer can check against the TCAWS tables.`

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
