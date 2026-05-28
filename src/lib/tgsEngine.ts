// TGS Decision Engine — TCAW v6.1 (TS 05492) + Amendments TD 00003:2022, TD 00031:2022
import type { RoadData, WorkParams, WorkZone, TGSResult, TGSType, ControlMethod, PlacedSign, SignSizeClass, TGSPhaseDetail, IntersectionArm, IntersectionTreatment } from '../types'
import { haversineM } from './geometry'

// TCAW representative vpd by OSM road classification
const TCAW_VPD: Record<string, number> = {
  motorway: 25000, motorway_link: 20000,
  trunk: 15000,    trunk_link: 10000,
  primary: 8000,   primary_link: 5000,
  secondary: 3000, secondary_link: 2000,
  tertiary: 1000,  tertiary_link: 750,
  unclassified: 500, residential: 500,
  service: 50,
}

export function polylineLengthM(pts: import('../types').LatLng[]): number {
  let total = 0
  for (let i = 0; i < pts.length - 1; i++) total += haversineM(pts[i], pts[i + 1])
  return total
}

// TCAW §5.5 taper lengths
function taperLengthM(speedKmh: number): number {
  if (speedKmh <= 45) return 15
  if (speedKmh <= 65) return 30
  if (speedKmh <= 85) return 60
  return 130
}

// TCAW §6.2.2 cone/marker spacing
function coneSpacingM(speedKmh: number): number {
  if (speedKmh <= 45) return 4
  if (speedKmh <= 65) return 8
  if (speedKmh <= 85) return 15
  return 30
}

// AS 1743 sign size by speed; night work steps up one class
function signSize(speedKmh: number, isNight = false): SignSizeClass {
  let s: SignSizeClass = speedKmh <= 50 ? 'B' : speedKmh <= 65 ? 'B' : speedKmh <= 85 ? 'C' : 'D'
  if (isNight) s = ({ A: 'B', B: 'C', C: 'D', D: 'D' } as const)[s]
  return s
}

// TCAW §4.1 speed zone value in work zone
function reducedSpeedKmh(speedKmh: number): number {
  return Math.max(25, Math.round((speedKmh * 0.625) / 10) * 10)
}

// TCAW §5.3 Table 5-1: minimum advance warning distance (T1-1 to taper start)
function minAdvanceWarningDistM(speedKmh: number): number {
  if (speedKmh <= 40) return 40
  if (speedKmh <= 50) return 60
  if (speedKmh <= 60) return 80
  if (speedKmh <= 70) return 100
  if (speedKmh <= 80) return 150
  if (speedKmh <= 100) return 200
  return 250
}

// TCAW Table B-5 all-red intergreen time
function allRedSeconds(wzLengthM: number): number {
  const stopLineDist = Math.min(45, wzLengthM * 0.3 + 30)
  if (stopLineDist <= 30) return 2
  if (stopLineDist <= 45) return 5
  if (stopLineDist <= 75) return 10
  return Math.ceil(15 + (stopLineDist - 75) / 5)
}

function computeWorkSummary(p: WorkParams) {
  const startMs = new Date(p.startDate).getTime()
  const endMs   = new Date(p.endDate).getTime()
  const totalDays = Math.max(1, Math.round((endMs - startMs) / 86_400_000) + 1)
  const is24h = p.dayStart === '00:00' && p.dayEnd === '23:59'
  const hasOvernight = totalDays >= 2 && !is24h
  const ttlEligible  = totalDays <= 7
  return { totalDays, hasOvernight, ttlEligible }
}

function selectControl(speedKmh: number, vpd: number, wzLengthM: number): {
  tgsType: TGSType; controlMethod: ControlMethod; flashingArrow: boolean
} {
  if (speedKmh > 85)
    return { tgsType: 'TTL_PORTABLE', controlMethod: 'PTCD', flashingArrow: true }
  if (speedKmh > 65)
    return { tgsType: 'TTL_PORTABLE', controlMethod: 'PTCD', flashingArrow: false }
  if (vpd < 100 && wzLengthM < 100)
    return { tgsType: 'BASIC_DEVICES', controlMethod: 'PASSIVE', flashingArrow: false }
  return { tgsType: 'STOP_SLOW_BAT', controlMethod: 'MANUAL', flashingArrow: false }
}

function buildSigns(
  tgsType: TGSType,
  speed: number,
  D: number,
  taperLen: number,
  wzLen: number,
  advanceDist: number,
  advanceLevels: number,
  advanceSpacing: number,
  speedZoneEnabled: boolean,
  speedZoneKmh: number,
  flashingArrow: boolean,
  closedSide: 'left' | 'right' | null,
  sz: SignSizeClass,
): PlacedSign[] {
  const signs: PlacedSign[] = []
  const chevron: string = closedSide === 'right' ? 'T5-4-right' : 'T5-4-left'
  const chevronEnd: string = closedSide === 'right' ? 'T5-5-right' : 'T5-5-left'

  // ── Approach A (from start pin) advance warning ──────────────────────────
  for (let lvl = 0; lvl < advanceLevels; lvl++) {
    const dist = -(advanceDist + taperLen - lvl * advanceSpacing)
    signs.push({ code: 'T1-1', distanceM: dist, approach: 'A', description: 'Roadwork Ahead', sizeClass: sz })
    if (speedZoneEnabled) {
      signs.push({ code: 'T1-3', distanceM: dist, approach: 'A', description: `Speed Limit ${speedZoneKmh} km/h`, sizeClass: sz })
    }
  }

  // ── Approach B (from end pin) advance warning ────────────────────────────
  for (let lvl = 0; lvl < advanceLevels; lvl++) {
    const dist = wzLen + taperLen + advanceDist - lvl * advanceSpacing
    signs.push({ code: 'T1-1', distanceM: dist, approach: 'B', description: 'Roadwork Ahead', sizeClass: sz })
    if (speedZoneEnabled) {
      signs.push({ code: 'T1-3', distanceM: dist, approach: 'B', description: `Speed Limit ${speedZoneKmh} km/h`, sizeClass: sz })
    }
  }

  // ── Bat control: sequence signs on each approach ─────────────────────────
  if (tgsType === 'STOP_SLOW_BAT') {
    // T1-4 (Prepare to Stop) at 2/3 of advance dist before taper
    const prepDist = Math.round(advanceDist * 2 / 3)
    // T1-6 (One Lane Road Ahead) at 1/3 of advance dist before taper
    const oneLaneDist = Math.round(advanceDist / 3)
    signs.push({ code: 'T1-4', distanceM: -(taperLen + prepDist), approach: 'A', description: 'Prepare to Stop', sizeClass: sz })
    signs.push({ code: 'T1-6', distanceM: -(taperLen + oneLaneDist), approach: 'A', description: 'One Lane Road Ahead', sizeClass: sz })
    signs.push({ code: 'T5-2-stop', distanceM: -taperLen, approach: 'A', description: 'Stop/Slow Bat — controller A', sizeClass: sz })
    signs.push({ code: 'T1-6', distanceM: wzLen + taperLen + oneLaneDist, approach: 'B', description: 'One Lane Road Ahead', sizeClass: sz })
    signs.push({ code: 'T1-4', distanceM: wzLen + taperLen + prepDist, approach: 'B', description: 'Prepare to Stop', sizeClass: sz })
    signs.push({ code: 'T5-2-stop', distanceM: wzLen + taperLen, approach: 'B', description: 'Stop/Slow Bat — controller B', sizeClass: sz })
  }

  if (tgsType === 'TTL_PORTABLE' || tgsType === 'BASIC_DEVICES') {
    if (flashingArrow) {
      const arrowCode = closedSide === 'right' ? 'T5-15-right' : 'T5-15-left'
      signs.push({ code: arrowCode, distanceM: -taperLen / 2, approach: 'A', description: 'Flashing Arrow Board', sizeClass: 'D' })
    }
  }

  // ── Taper A: entry hazard markers ────────────────────────────────────────
  const spacing = coneSpacingM(speed)
  const markerCount = Math.ceil(taperLen / spacing)
  for (let i = 0; i <= markerCount; i++) {
    const d = -taperLen + i * spacing
    if (d <= 0) signs.push({ code: chevron, distanceM: d, approach: 'A', description: 'Hazard Marker (entry taper)', sizeClass: sz })
  }

  // ── Taper B: exit hazard markers ─────────────────────────────────────────
  for (let i = 0; i <= markerCount; i++) {
    const d = wzLen + i * spacing
    if (d <= wzLen + taperLen) signs.push({ code: chevronEnd, distanceM: d, approach: 'B', description: 'Hazard Marker (exit taper)', sizeClass: sz })
  }

  // ── Work zone entry / exit ────────────────────────────────────────────────
  signs.push({ code: 'T1-9',  distanceM: 0,     approach: 'both', description: 'Work Zone',    sizeClass: sz })
  signs.push({ code: 'T1-10', distanceM: wzLen,  approach: 'both', description: 'End Roadwork', sizeClass: sz })

  // ── Recovery delineation (one chevron past exit taper) ───────────────────
  signs.push({ code: chevronEnd, distanceM: wzLen + taperLen + D, approach: 'B', description: 'Recovery delineation', sizeClass: sz })

  return signs
}

function buildComplianceNotes(
  tgsType: TGSType,
  speedKmh: number,
  vpd: number,
  taperLen: number,
  hasSpeedZone: boolean,
): string[] {
  const notes: string[] = []
  notes.push('TCAW v6.1 §5.2.1 — Dimension D = speed ÷ 3.6')
  if (tgsType === 'STOP_SLOW_BAT') notes.push('TCAW §5.7 — Manual stop/slow bat; traffic controller required')
  if (tgsType === 'TTL_PORTABLE') notes.push('TCAW §5.6 / Appendix B — PTCD (portable traffic signals)')
  if (tgsType === 'BASIC_DEVICES') notes.push('TCAW §5.1 — Passive control: GIVE WAY + delineation only')
  if (speedKmh > 85) notes.push('TCAW §5.9 — Motorway: PTCD mandatory; flashing arrow mandatory')
  if (speedKmh > 65) notes.push('TCAW §5.2 — Speed >65 km/h: PTCD required; manual control not permitted')
  if (hasSpeedZone) notes.push('TCAW §4.1 — Speed zone required (taper >60m or speed >65 km/h)')
  if (!hasSpeedZone) notes.push('TCAW §4.1 — Speed zone not required (≤65 km/h road, taper <60m)')
  if (taperLen >= 60) notes.push('TCAW §5.5 — Taper ≥60m: speed zone mandatory at zone entry')
  if (vpd > 20000) notes.push('TCAW §5.2 — Volume >20,000 vpd: SCATS/SCOOT integration preferred')
  notes.push('TCAW §6.4 — Signs installed/removed in sequence; documented daily inspection required')
  return notes
}

// TCAW vpd lookup (shared with intersection treatment)
const TCAW_VPD_MAP = TCAW_VPD

function buildIntersectionTreatments(
  intersections: IntersectionArm[],
  mainSpeedKmh: number,
  sz: SignSizeClass,
  closedSide: 'left' | 'right' | null,
  overrides: Record<string, IntersectionTreatment['treatment']> = {},
): IntersectionTreatment[] {
  return intersections.map(arm => {
    const armD = Math.round(arm.speedLimit / 3.6)
    const armVpd = TCAW_VPD_MAP[arm.classification] ?? 500
    const armLabel = arm.name ?? `Unnamed road (${arm.classification})`

    // Auto-detect default: arm on the closed side → road closure; else use volume/classification logic
    const onClosedSide = closedSide !== null && arm.joinSide === closedSide
    const autoTreatment: IntersectionTreatment['treatment'] = onClosedSide
      ? 'ROAD_CLOSURE'
      : arm.classification === 'service' && armVpd < 100
        ? 'GIVE_WAY'
        : 'CONTROLLER'

    const treatment = overrides[arm.wayId] ?? autoTreatment

    const signsOnSideRoad: PlacedSign[] = [
      {
        code: 'T1-1',
        distanceM: -armD,
        approach: 'A',
        description: 'Roadwork Ahead (side road approach)',
        sizeClass: sz,
      },
    ]

    const notes: string[] = []

    if (treatment === 'ROAD_CLOSURE') {
      signsOnSideRoad.push({
        code: 'T2-6',
        distanceM: 0,
        approach: 'A',
        description: 'Road Closed (side road at junction)',
        sizeClass: sz,
      })
      notes.push(`${armLabel} to be physically closed at junction — barriers and T2-6 Road Closed sign required`)
      notes.push('Verify residents on side road have alternative access before closing')
    } else if (treatment === 'CONTROLLER') {
      signsOnSideRoad.push({
        code: 'T1-34',
        distanceM: -Math.round(armD / 2),
        approach: 'A',
        description: 'Traffic Controller Ahead (side road)',
        sizeClass: sz,
      })
      signsOnSideRoad.push({
        code: 'T5-2',
        distanceM: 0,
        approach: 'A',
        description: 'Stop/Slow bat (controller at junction)',
        sizeClass: sz,
      })
      notes.push(`Controller at ${armLabel} junction must coordinate with main road bat operators`)
      notes.push(`Hold side road traffic when live lane occupied; release when bat signals SLOW`)
      if (arm.lanes > 1)
        notes.push(`${arm.lanes}-lane approach — controller to manage both lanes`)
      if (mainSpeedKmh > 60)
        notes.push(`Main road speed ${mainSpeedKmh} km/h — controller must maintain clear sightlines`)
    } else {
      notes.push(`Low-volume service road — GIVE WAY sign on ${armLabel} approach is sufficient`)
      notes.push('Verify sight distance from side road to live lane is adequate before relying on passive control')
    }

    return {
      arm,
      treatment,
      autoTreatment,
      signsOnSideRoad,
      additionalPersonnel: treatment === 'CONTROLLER' ? 1 : 0,
      notes,
    }
  })
}

export function runTGSEngine(
  roadData: RoadData,
  workParams: WorkParams,
  workZone: WorkZone,
  intersections: IntersectionArm[] = [],
  treatmentOverrides: Record<string, IntersectionTreatment['treatment']> = {},
): TGSResult {
  const speed = roadData.speedLimit
  const D = Math.round(speed / 3.6)
  const vpd = TCAW_VPD[roadData.classification] ?? 500
  const wzLen = workZone.polyline ? Math.round(polylineLengthM(workZone.polyline)) : 60

  const { hasOvernight, ttlEligible, totalDays } = computeWorkSummary(workParams)

  const taperLen = taperLengthM(speed)
  const coneSpace = coneSpacingM(speed)
  const sz = signSize(speed)

  const { tgsType, controlMethod, flashingArrow } = selectControl(speed, vpd, wzLen)

  // Advance warning levels and distances — TCAW §5.3 Table 5-1
  let advanceLevels = 1, advanceSpacing = D
  if (speed > 85)      advanceLevels = 3
  else if (speed > 65) advanceLevels = 2
  // Advance dist = max of minimum table value and D × levels (D-spacing between signs)
  const advanceDist = Math.max(minAdvanceWarningDistM(speed), D * advanceLevels)

  // Speed zone — required if taper >60m or speed >65 km/h
  const speedZoneEnabled = taperLen >= 60 || speed > 65
  const speedZoneKmh = reducedSpeedKmh(speed)

  const signs = buildSigns(
    tgsType, speed, D, taperLen, wzLen, advanceDist,
    advanceLevels, advanceSpacing,
    speedZoneEnabled, speedZoneKmh,
    flashingArrow, workZone.closedSide, sz,
  )

  const intersectionTreatments = buildIntersectionTreatments(intersections, speed, sz, workZone.closedSide, treatmentOverrides)
  const intersectionPersonnel = intersectionTreatments.reduce((sum, t) => sum + t.additionalPersonnel, 0)

  // Fold side-road signs into the main sign list
  for (const t of intersectionTreatments) {
    const roadName = t.arm.name ?? `Unnamed road (${t.arm.classification})`
    for (const s of t.signsOnSideRoad) {
      signs.push({ ...s, approach: 'side-road', roadName })
    }
  }

  // Phases
  const phases: TGSPhaseDetail[] = []

  const dayNotes: string[] = ['Traffic controllers on site during working hours']
  if (tgsType === 'STOP_SLOW_BAT') dayNotes.push('Both stop/slow bats staffed simultaneously')
  for (const t of intersectionTreatments) {
    const armLabel = t.arm.name ?? `Unnamed road (${t.arm.classification})`
    if (t.treatment === 'CONTROLLER') {
      dayNotes.push(`Controller required at ${armLabel} junction (${Math.round(t.arm.distanceAlongWzM)}m along WZ) — hold side road; release on SLOW signal`)
      if (t.arm.lanes > 1) dayNotes.push(`${armLabel}: ${t.arm.lanes}-lane approach — controller to manage both lanes`)
    } else if (t.treatment === 'ROAD_CLOSURE') {
      dayNotes.push(`${armLabel} closed at junction (${Math.round(t.arm.distanceAlongWzM)}m along WZ) — barriers + T2-6 Road Closed sign; confirm alternative access`)
    } else {
      dayNotes.push(`GIVE WAY (passive) at ${armLabel} — verify sight distance to live lane before works commence`)
    }
  }
  phases.push({ phase: 'DAY', tgsType, controlMethod, notes: dayNotes })

  if (hasOvernight) {
    if (ttlEligible) {
      const overnightNotes = [
        'TTL operates unattended on fixed-time cycle',
        'Daily inspection before handover to night mode required',
        'Manual override (key) must be installed',
        `Activation: ${workParams.dayEnd} → TTL night mode`,
        `Deactivation: ${workParams.dayStart} → bat resumes`,
      ]
      phases.push({ phase: 'OVERNIGHT', tgsType: 'TTL_PORTABLE', controlMethod: 'PTCD', notes: overnightNotes })
    } else {
      phases.push({
        phase: 'OVERNIGHT',
        tgsType: 'TTL_PORTABLE',
        controlMethod: 'PTCD',
        notes: [`Works exceed 7 days (${totalDays} days) — TTL overnight not eligible. Engineer to specify alternate overnight arrangement.`],
      })
    }
  }

  // TTL timing (overnight or PTL scenario)
  const allRed = allRedSeconds(wzLen)
  const ttlTiming = (hasOvernight && ttlEligible) || tgsType === 'TTL_PORTABLE'
    ? {
        greenWorkS: 35,
        greenThroughS: 45,
        allRedS: allRed,
        cycleS: 35 + allRed + 45 + allRed,
        mode: 'FIXED_TIME' as const,
      }
    : null

  const personnel = (controlMethod === 'PASSIVE' ? 0
    : tgsType === 'STOP_SLOW_BAT' ? 2  // one each end
    : 1) + intersectionPersonnel

  // Buffer = 1D between taper end and work activity (TCAW §5.2.2)
  const bufferLength = D

  // Delineator count: both tapers + work zone edge cones
  const taperCones = Math.ceil(taperLen / coneSpace)
  const wzCones = Math.ceil(wzLen / coneSpace) + 1
  const delineatorCount = taperCones * 2 + wzCones

  const warnings: string[] = []
  if (totalDays > 7 && hasOvernight)
    warnings.push(`Works span ${totalDays} days — TTL overnight not eligible (>7 days). Specify alternate overnight control.`)
  if (speed > 85 && vpd > 20000)
    warnings.push('Volume >20,000 vpd on high-speed road — SCATS/SCOOT integration may be required.')
  if (wzLen < taperLen)
    warnings.push(`Work zone length (${wzLen}m) is shorter than taper length (${taperLen}m) — verify site constraints.`)

  return {
    tgsType,
    controlMethod,
    D,
    workZoneLength: wzLen,
    taperLength: taperLen,
    coneSpacingM: coneSpace,
    speedZone: speedZoneEnabled
      ? { enabled: true, speedKmh: speedZoneKmh, startDistanceM: advanceDist + taperLen, endDistanceM: wzLen + taperLen + D }
      : null,
    advanceWarning: { distanceM: advanceDist, levels: advanceLevels, spacingM: advanceSpacing },
    phases,
    signs,
    ttlTiming,
    personnelRequired: personnel,
    flashingArrowRequired: flashingArrow,
    bufferLength,
    delineatorCount,
    complianceNotes: buildComplianceNotes(tgsType, speed, vpd, taperLen, speedZoneEnabled),
    warnings,
    intersectionTreatments,
  }
}
