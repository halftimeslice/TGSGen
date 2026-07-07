import type {
  WorkParams, RoadData, WorkZone, IntersectionArm, RingInfo, RoundaboutData,
  TGSResult, IntersectionTreatment, PlacedSign, SignSizeClass,
} from '../types'
import { haversineM } from './geometry'
import { classifyArm, travelArcOnLeft } from './ringArcs'

// ─── Shape returned by the helper server (mirrors server/tgsSchema.mjs) ──────

type AiPlacedSign = {
  code: string
  distanceM: number
  approach: 'A' | 'B' | 'both' | 'side-road'
  roadName: string | null
  description: string
  sizeClass: SignSizeClass
}

type AiSideRoad = {
  wayId: string
  name: string | null
  treatment: IntersectionTreatment['treatment']
  signs: AiPlacedSign[]
  notes: string[]
}

type AiTGS = {
  tgsType: TGSResult['tgsType']
  controlMethod: TGSResult['controlMethod']
  D: number
  workZoneLength: number
  taperLength: number
  coneSpacingM: number
  speedZone: { speedKmh: number; startDistanceM: number; endDistanceM: number } | null
  advanceWarning: { distanceM: number; levels: number; spacingM: number }
  phases: TGSResult['phases']
  signs: AiPlacedSign[]
  ttlTiming: TGSResult['ttlTiming']
  personnelRequired: number
  flashingArrowRequired: boolean
  bufferLength: number
  delineatorCount: number
  sideRoads: AiSideRoad[]
  complianceNotes: string[]
  warnings: string[]
  justification: string
}

// ─── Job input ────────────────────────────────────────────────────────────────

export type GenerateJobInput = {
  workParams: WorkParams
  roadData: RoadData
  workZone: WorkZone
  intersections: IntersectionArm[]
  roundabout: RoundaboutData | null
  ring: RingInfo | null
}

function polylineLengthM(pts: Array<{ lat: number; lng: number }>): number {
  let len = 0
  for (let i = 0; i < pts.length - 1; i++) len += haversineM(pts[i], pts[i + 1])
  return len
}

function toSign(s: AiPlacedSign): PlacedSign {
  return {
    code: s.code,
    distanceM: s.distanceM,
    approach: s.approach,
    ...(s.roadName ? { roadName: s.roadName } : {}),
    description: s.description,
    sizeClass: s.sizeClass,
  }
}

// ─── Generation ───────────────────────────────────────────────────────────────

export async function generateTGS(input: GenerateJobInput): Promise<{ result: TGSResult; usage: unknown }> {
  const { workParams, roadData, workZone, intersections, roundabout, ring } = input

  // Which ring arc the closed corridor covers: arms on that arc default to
  // closed at the roundabout (engineer can overrule later). The corridor's
  // left side hugs the travel arc when the ring curls left at the entry —
  // same geometry test LaneSideOverlay uses to draw the corridors.
  let closedArc: 'travel' | 'far' | null = null
  const entrySeg = workZone.polylineSegments?.find(s => s.type === 'road')
  if (ring && workZone.closedSide && entrySeg && entrySeg.nodes.length >= 2) {
    const travelLeft = travelArcOnLeft(
      ring,
      entrySeg.nodes[entrySeg.nodes.length - 2],
      entrySeg.nodes[entrySeg.nodes.length - 1],
    )
    closedArc = (workZone.closedSide === 'left') === travelLeft ? 'travel' : 'far'
  }

  const payload = {
    closureDetails: workParams,
    roadData,
    workZone: {
      closedSide: workZone.closedSide,
      lengthM: workZone.polyline ? Math.round(polylineLengthM(workZone.polyline)) : null,
      polyline: workZone.polyline,
      segments: workZone.polylineSegments?.map(s => ({ type: s.type, nodeCount: s.nodes.length })),
    },
    intersections: intersections.map(a => ({
      wayId: a.wayId,
      name: a.name,
      classification: a.classification,
      speedLimit: a.speedLimit,
      lanes: a.lanes,
      distanceAlongWzM: a.distanceAlongWzM,
      joinSide: a.joinSide,
    })),
    roundabout: roundabout
      ? {
          type: roundabout.type,
          center: roundabout.center,
          arms: roundabout.arms.map(a => {
            const role = ring ? classifyArm(ring, a) : null
            return {
              wayId: a.wayId,
              name: a.name,
              lanes: a.lanes,
              speedLimit: a.speedLimit,
              isOneWay: a.isOneWay,
              oneWayDir: a.oneWayDir,
              angleFromCenter: Math.round(a.angleFromCenter),
              // 'entry'/'exit' = the arm carries the selected route
              routeRole: role === 'entry' || role === 'exit' ? role : null,
              // Arm meets the ring on the closed side's arc — closed by default
              defaultClosed: closedArc !== null && role === closedArc,
            }
          }),
        }
      : null,
  }

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(body?.error ?? `Generation failed (${res.status})`)
  }

  const ai = body.tgs as AiTGS
  return { result: convertToTGSResult(ai, intersections), usage: body.usage }
}

// Convert the AI's answer into the TGSResult shape the renderer draws
function convertToTGSResult(ai: AiTGS, intersections: IntersectionArm[]): TGSResult {
  const warnings = [...ai.warnings]

  const intersectionTreatments: IntersectionTreatment[] = []
  for (const sr of ai.sideRoads) {
    const arm = intersections.find(a => a.wayId === sr.wayId)
    if (!arm) {
      warnings.push(`AI referenced an unknown side road (${sr.name ?? sr.wayId}) — treatment not drawn`)
      continue
    }
    intersectionTreatments.push({
      arm,
      treatment: sr.treatment,
      autoTreatment: sr.treatment,
      signsOnSideRoad: sr.signs.map(toSign),
      additionalPersonnel: 0,
      notes: sr.notes,
    })
  }

  return {
    tgsType: ai.tgsType,
    controlMethod: ai.controlMethod,
    D: ai.D,
    workZoneLength: ai.workZoneLength,
    taperLength: ai.taperLength,
    coneSpacingM: ai.coneSpacingM,
    speedZone: ai.speedZone
      ? { enabled: true, speedKmh: ai.speedZone.speedKmh, startDistanceM: ai.speedZone.startDistanceM, endDistanceM: ai.speedZone.endDistanceM }
      : null,
    advanceWarning: ai.advanceWarning,
    phases: ai.phases,
    signs: ai.signs.map(toSign),
    ttlTiming: ai.ttlTiming,
    personnelRequired: ai.personnelRequired,
    flashingArrowRequired: ai.flashingArrowRequired,
    bufferLength: ai.bufferLength,
    delineatorCount: ai.delineatorCount,
    complianceNotes: ai.complianceNotes,
    warnings,
    intersectionTreatments,
    justification: ai.justification,
  }
}
