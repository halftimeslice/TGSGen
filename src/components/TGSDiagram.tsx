import { useMemo } from 'react'
import type { TGSResult, WorkParams, RoadData, PlacedSign } from '../types'
import { SignIcon } from './SignIcon'

type Props = {
  tgsResult: TGSResult
  workParams: WorkParams
  roadData: RoadData
}

// ── Layout constants ─────────────────────────────────────────────────────────
const TITLE_H   = 96
const DIAGRAM_H = 380
const ZONE_BAR_H = 50
const NOTES_H   = 70
const TOTAL_H   = TITLE_H + DIAGRAM_H + ZONE_BAR_H + NOTES_H

const MARGIN_X  = 52
const ROAD_Y    = TITLE_H + DIAGRAM_H / 2          // centreline Y
const LANE_GAP  = 9                                  // px between lane lines
const SIGN_PX   = 32                                 // sign icon size
const SIGN_STEP = 38                                 // vertical step when stacking signs
const MAX_SIGNS_ABOVE = Math.floor((DIAGRAM_H / 2 - 20) / SIGN_STEP)
const MAX_SIGNS_BELOW = MAX_SIGNS_ABOVE

const TGS_TYPE_LABEL: Record<string, string> = {
  BASIC_DEVICES: 'Basic Devices (Passive)',
  STOP_SLOW_BAT: 'Stop / Slow Bat',
  TTL_PORTABLE:  'Portable Traffic Lights (PTCD)',
  FULL_CLOSURE:  'Full Closure',
}
const CTRL_LABEL: Record<string, string> = {
  PASSIVE: 'Passive',
  MANUAL:  'Manual controller',
  PTCD:    'PTCD',
}

// Zone background colours (CSS)
const ZONE_FILL: Record<string, string> = {
  advance_a:  '#1e3a5f',
  taper_a:    '#7c2d12',
  wz:         '#1c1917',
  taper_b:    '#7c2d12',
  advance_b:  '#1e3a5f',
}
const ZONE_LABEL_COLOR: Record<string, string> = {
  advance_a:  '#93c5fd',
  taper_a:    '#fdba74',
  wz:         '#fcd34d',
  taper_b:    '#fdba74',
  advance_b:  '#93c5fd',
}

// Sign codes to show on the schematic (exclude chevrons/cones which are counted not drawn)
const SCHEMATIC_SIGN_CODES = new Set([
  'T1-1', 'T1-3', 'T1-4', 'T1-6', 'T1-9', 'T1-10',
  'T5-2-stop', 'T5-2-slow', 'T5-2',
  'T2-6', 'T5-15-left', 'T5-15-right',
  'T1-34', 'T1-25',
])

// ── Types ────────────────────────────────────────────────────────────────────

type Zone = {
  id: string
  label: string
  fromM: number
  toM: number
}

type SignEntry = {
  sign: PlacedSign
  xPx: number
  stackIdx: number
  side: 'above' | 'below'
}

// ── Component ────────────────────────────────────────────────────────────────

export function TGSDiagram({ tgsResult, workParams, roadData }: Props) {
  const wzLen    = tgsResult.workZoneLength
  const taperLen = tgsResult.taperLength
  const advDist  = tgsResult.advanceWarning.distanceM
  const D        = tgsResult.D

  // Total horizontal extent (metres)
  const fromM   = -(advDist + taperLen + D * 0.5)
  const toM     = wzLen + taperLen + advDist + D * 0.5
  const spanM   = toM - fromM

  // Horizontal scale: try to fit in 1400px but ensure a minimum scale
  const minWidth = 1000
  const rawWidth = Math.max(minWidth, MARGIN_X * 2 + spanM * 2)
  const svgW     = rawWidth
  const pxPerM   = (svgW - MARGIN_X * 2) / spanM

  function mToPx(metres: number): number {
    return MARGIN_X + (metres - fromM) * pxPerM
  }

  // Zones
  const zones: Zone[] = [
    { id: 'advance_a', label: 'Advance Warning', fromM: -(advDist + taperLen), toM: -taperLen },
    { id: 'taper_a',   label: 'Entry Taper',     fromM: -taperLen,             toM: 0 },
    { id: 'wz',        label: 'Work Zone',        fromM: 0,                     toM: wzLen },
    { id: 'taper_b',   label: 'Exit Taper',       fromM: wzLen,                 toM: wzLen + taperLen },
    { id: 'advance_b', label: 'Advance Warning',  fromM: wzLen + taperLen,      toM: wzLen + taperLen + advDist },
  ]

  // Signs to render (filter to schematic-relevant codes only, deduplicate per approach slot)
  const signEntries = useMemo<SignEntry[]>(() => {
    const mainSigns = tgsResult.signs.filter(
      s => SCHEMATIC_SIGN_CODES.has(s.code) && s.approach !== 'side-road'
    )

    // Group by approach and xPx bucket (cluster within 30px)
    const bucketSizeM = 30 / pxPerM
    const seenA = new Map<string, number>()  // bucketKey → stackIdx
    const seenB = new Map<string, number>()

    const entries: SignEntry[] = []
    for (const sign of mainSigns) {
      const side: 'above' | 'below' = sign.approach === 'B' ? 'below' : 'above'
      const seenMap = side === 'above' ? seenA : seenB

      const bucketKey = `${sign.code}:${Math.round(sign.distanceM / bucketSizeM)}`
      if (seenMap.has(bucketKey)) continue
      const stackIdx = seenMap.size
      seenMap.set(bucketKey, stackIdx)

      entries.push({ sign, xPx: mToPx(sign.distanceM), stackIdx, side })
    }
    return entries
  }, [tgsResult.signs, pxPerM, mToPx])

  const today = new Date().toISOString().split('T')[0]

  const roadName = roadData.name ?? 'Unnamed Road'
  const speedStr = `${roadData.speedLimit} km/h`
  const laneStr  = `${roadData.lanes} lane${roadData.lanes > 1 ? 's' : ''}`

  // ── SVG rendering helpers ─────────────────────────────────────────────────

  function renderTitleBlock() {
    return (
      <g>
        <rect x={0} y={0} width={svgW} height={TITLE_H} fill="#18181b" stroke="#52525b" strokeWidth={1} />
        <text x={16} y={24} fill="#f4f4f5" fontSize={16} fontWeight="bold" fontFamily="Arial, sans-serif">
          TGS DRAWING — {roadName}
        </text>
        <text x={16} y={44} fill="#a1a1aa" fontSize={10} fontFamily="Arial, sans-serif">
          Type: {TGS_TYPE_LABEL[tgsResult.tgsType]}   ·   Control: {CTRL_LABEL[tgsResult.controlMethod]}
          {'   ·   '}Speed: {speedStr}   ·   {laneStr}
        </text>
        <text x={16} y={60} fill="#a1a1aa" fontSize={10} fontFamily="Arial, sans-serif">
          Works: {workParams.worksDescription || '—'}
        </text>
        <text x={16} y={76} fill="#a1a1aa" fontSize={10} fontFamily="Arial, sans-serif">
          Period: {workParams.startDate} to {workParams.endDate}
          {'   ·   '}Hours: {workParams.dayStart}–{workParams.dayEnd}
          {'   ·   '}Personnel: {tgsResult.personnelRequired}
          {'   ·   '}Delineators: {tgsResult.delineatorCount}
        </text>

        {/* Right side: generated date + standard reference */}
        <text x={svgW - 16} y={24} fill="#f4f4f5" fontSize={10} fontFamily="Arial, sans-serif" textAnchor="end">
          TGSgen — NSW Traffic Guidance Scheme Generator
        </text>
        <text x={svgW - 16} y={40} fill="#a1a1aa" fontSize={9} fontFamily="Arial, sans-serif" textAnchor="end">
          Generated: {today}   ·   TCAW v6.1   ·   AS 1742.3
        </text>
        <line x1={0} y1={TITLE_H - 1} x2={svgW} y2={TITLE_H - 1} stroke="#3f3f46" strokeWidth={1} />
      </g>
    )
  }

  function renderZoneBands() {
    const y = TITLE_H
    const h = DIAGRAM_H
    const elems: React.ReactElement[] = []
    for (const z of zones) {
      const x1 = mToPx(z.fromM)
      const x2 = mToPx(z.toM)
      elems.push(
        <rect key={z.id} x={x1} y={y} width={x2 - x1} height={h}
          fill={ZONE_FILL[z.id]} opacity={0.6} />
      )
      elems.push(
        <line key={`div-${z.id}`} x1={x1} y1={y} x2={x1} y2={y + h}
          stroke="#52525b" strokeWidth={1} strokeDasharray="4 3" />
      )
    }
    return <>{elems}</>
  }

  function renderRoadLines() {
    const y1 = ROAD_Y - LANE_GAP
    const y2 = ROAD_Y + LANE_GAP
    const x1 = mToPx(fromM)
    const x2 = mToPx(toM)

    // Full road lines
    const roadElems: React.ReactElement[] = [
      <line key="lane1" x1={x1} y1={y1} x2={x2} y2={y1} stroke="#d4d4d4" strokeWidth={2} />,
      <line key="lane2" x1={x1} y1={y2} x2={x2} y2={y2} stroke="#d4d4d4" strokeWidth={2} />,
    ]

    // Centreline dashes between taper ends
    const clX1 = mToPx(-(advDist + taperLen))
    const clX2 = mToPx(wzLen + taperLen + advDist)
    roadElems.push(
      <line key="cl" x1={clX1} y1={ROAD_Y} x2={clX2} y2={ROAD_Y}
        stroke="#6b7280" strokeWidth={1} strokeDasharray="8 5" />
    )

    // Work zone closed side fill
    const wzX1 = mToPx(-taperLen)
    const wzX2 = mToPx(wzLen + taperLen)
    const closedY1 = tgsResult.tgsType !== 'FULL_CLOSURE'
      ? (tgsResult.signs.some(s => s.code.startsWith('T5-4-right')) ? ROAD_Y : ROAD_Y - LANE_GAP)
      : ROAD_Y - LANE_GAP
    roadElems.push(
      <rect key="wz-fill" x={wzX1} y={ROAD_Y - LANE_GAP} width={wzX2 - wzX1} height={LANE_GAP * 2}
        fill="#dc2626" opacity={0.3} />
    )

    // Approach arrows
    const arrowY = ROAD_Y
    const arrAx  = mToPx(-(advDist + taperLen) - 2)
    const arrBx  = mToPx(wzLen + taperLen + advDist + 2)
    roadElems.push(
      <text key="arr-a" x={arrAx} y={arrowY + 4} fill="#60a5fa" fontSize={13}
        fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="end">▶ A</text>,
      <text key="arr-b" x={arrBx} y={arrowY + 4} fill="#4ade80" fontSize={13}
        fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="start">B ◀</text>,
    )

    // Taper wedge (left-of-travel closed side)
    // Entry taper: from x=-taperLen to x=0, lane narrows on closed side
    // Exit taper: from x=wzLen to x=wzLen+taperLen
    const closedOffY = -LANE_GAP  // draws the closed side above centreline

    // Entry taper wedge
    const eTaperX1 = mToPx(-taperLen)
    const eTaperX2 = mToPx(0)
    roadElems.push(
      <polygon key="taper-in"
        points={`${eTaperX1},${ROAD_Y + closedOffY} ${eTaperX2},${ROAD_Y} ${eTaperX2},${ROAD_Y + closedOffY}`}
        fill="#f97316" opacity={0.4} />
    )
    // Exit taper wedge
    const exTaperX1 = mToPx(wzLen)
    const exTaperX2 = mToPx(wzLen + taperLen)
    roadElems.push(
      <polygon key="taper-out"
        points={`${exTaperX1},${ROAD_Y} ${exTaperX2},${ROAD_Y + closedOffY} ${exTaperX1},${ROAD_Y + closedOffY}`}
        fill="#f97316" opacity={0.4} />
    )

    return <>{roadElems}</>
  }

  function renderSignMarkers() {
    const SIGN_PX_HALF = SIGN_PX / 2
    const elems: React.ReactElement[] = []

    for (const entry of signEntries) {
      const { sign, xPx, stackIdx, side } = entry
      const lim = side === 'above' ? MAX_SIGNS_ABOVE : MAX_SIGNS_BELOW
      if (stackIdx >= lim) continue

      const yOffset = stackIdx * SIGN_STEP
      const signY = side === 'above'
        ? ROAD_Y - LANE_GAP - 12 - SIGN_PX - yOffset
        : ROAD_Y + LANE_GAP + 12 + yOffset

      const lineY1 = side === 'above' ? signY + SIGN_PX + 2 : signY - 2
      const lineY2 = side === 'above' ? ROAD_Y - LANE_GAP : ROAD_Y + LANE_GAP

      const dist = Math.round(Math.abs(sign.distanceM))
      const distLabel = sign.distanceM < 0 ? `${dist}m` : `${dist}m`

      elems.push(
        <g key={`${sign.code}:${sign.approach}:${Math.round(sign.distanceM)}`}>
          <line x1={xPx} y1={lineY1} x2={xPx} y2={lineY2}
            stroke="#52525b" strokeWidth={1} strokeDasharray="3 2" />
          <foreignObject x={xPx - SIGN_PX_HALF} y={signY} width={SIGN_PX} height={SIGN_PX}>
            <div style={{ width: SIGN_PX, height: SIGN_PX, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SignIcon code={sign.code} px={SIGN_PX} />
            </div>
          </foreignObject>
          <text x={xPx} y={side === 'above' ? signY - 2 : signY + SIGN_PX + 9}
            fill="#e4e4e7" fontSize={7} fontFamily="monospace" textAnchor="middle">
            {sign.code}
          </text>
          <text x={xPx} y={side === 'above' ? signY - 11 : signY + SIGN_PX + 18}
            fill="#71717a" fontSize={7} fontFamily="monospace" textAnchor="middle">
            {distLabel}
          </text>
        </g>
      )
    }
    return <>{elems}</>
  }

  function renderSideRoadBranches() {
    if (!tgsResult.intersectionTreatments.length) return null

    const BRANCH_LEN   = 60   // px length of side road line in diagram
    const SIGN_PX_HALF = SIGN_PX / 2
    const elems: React.ReactElement[] = []

    for (const t of tgsResult.intersectionTreatments) {
      const arm      = t.arm
      const xPx      = mToPx(arm.distanceAlongWzM)
      const isLeft   = arm.joinSide === 'left'

      // Branch goes upward for left-side roads, downward for right-side
      const yStart   = isLeft ? ROAD_Y - LANE_GAP : ROAD_Y + LANE_GAP
      const yBranchEnd = isLeft ? yStart - BRANCH_LEN : yStart + BRANCH_LEN
      const labelY   = isLeft ? yBranchEnd - 4 : yBranchEnd + 10

      const treatColor = t.treatment === 'ROAD_CLOSURE' ? '#ef4444'
        : t.treatment === 'CONTROLLER' ? '#f97316'
        : '#22d3ee'

      // Branch line
      elems.push(
        <line key={`br-${arm.wayId}`}
          x1={xPx} y1={yStart} x2={xPx} y2={yBranchEnd}
          stroke={treatColor} strokeWidth={2} />,
        <text key={`br-label-${arm.wayId}`}
          x={xPx + 4} y={labelY}
          fill={treatColor} fontSize={7} fontFamily="Arial, sans-serif">
          {arm.name ?? `Unnamed (${arm.classification})`}
        </text>,
        <text key={`br-dist-${arm.wayId}`}
          x={xPx + 4} y={labelY + 9}
          fill="#71717a" fontSize={7} fontFamily="monospace">
          {arm.distanceAlongWzM < 0
            ? `${Math.abs(arm.distanceAlongWzM)}m before WZ`
            : arm.distanceAlongWzM > tgsResult.workZoneLength
              ? `${Math.round(arm.distanceAlongWzM - tgsResult.workZoneLength)}m past WZ`
              : `${arm.distanceAlongWzM}m along WZ`}
        </text>,
        <text key={`br-treat-${arm.wayId}`}
          x={xPx + 4} y={labelY + 18}
          fill={treatColor} fontSize={7} fontFamily="Arial, sans-serif" fontWeight="bold">
          {t.treatment === 'ROAD_CLOSURE' ? 'ROAD CLOSURE'
            : t.treatment === 'CONTROLLER' ? 'CONTROLLER'
            : 'GIVE WAY'}
        </text>,
      )

      // Signs along the branch
      const signs = t.signsOnSideRoad.filter(s =>
        ['T1-1', 'T1-34', 'T2-6', 'T5-2-stop', 'T5-2'].includes(s.code)
      )
      const direction = isLeft ? -1 : 1
      signs.forEach((sign, i) => {
        const signY = yStart + direction * (18 + i * (SIGN_PX + 4))
        elems.push(
          <foreignObject key={`br-sign-${arm.wayId}-${i}`}
            x={xPx - SIGN_PX_HALF} y={signY} width={SIGN_PX} height={SIGN_PX}>
            <div style={{ width: SIGN_PX, height: SIGN_PX, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SignIcon code={sign.code} px={SIGN_PX} />
            </div>
          </foreignObject>,
          <text key={`br-sign-label-${arm.wayId}-${i}`}
            x={xPx + SIGN_PX_HALF + 2} y={signY + SIGN_PX / 2 + 3}
            fill="#e4e4e7" fontSize={7} fontFamily="monospace">
            {sign.code}
          </text>,
        )
      })
    }

    return <>{elems}</>
  }

  function renderZoneBar() {
    const barY  = TITLE_H + DIAGRAM_H
    const barH  = ZONE_BAR_H
    const textY = barY + barH * 0.45
    const distY = barY + barH * 0.75
    const elems: React.ReactElement[] = [
      <rect key="bar-bg" x={0} y={barY} width={svgW} height={barH} fill="#18181b" />,
      <line key="bar-top" x1={0} y1={barY} x2={svgW} y2={barY} stroke="#3f3f46" strokeWidth={1} />,
    ]

    for (const z of zones) {
      const x1   = mToPx(z.fromM)
      const x2   = mToPx(z.toM)
      const midX = (x1 + x2) / 2
      const distM = Math.round(z.toM - z.fromM)
      elems.push(
        <line key={`zbar-div-${z.id}`} x1={x1} y1={barY} x2={x1} y2={barY + barH}
          stroke="#52525b" strokeWidth={1} />,
        <text key={`zbar-label-${z.id}`} x={midX} y={textY}
          fill={ZONE_LABEL_COLOR[z.id]} fontSize={9} fontFamily="Arial, sans-serif"
          textAnchor="middle" fontWeight="bold">
          {z.label}
        </text>,
        <text key={`zbar-dist-${z.id}`} x={midX} y={distY}
          fill="#71717a" fontSize={8} fontFamily="monospace" textAnchor="middle">
          {distM}m
        </text>,
      )
    }
    return <>{elems}</>
  }

  function renderComplianceBar() {
    const y = TITLE_H + DIAGRAM_H + ZONE_BAR_H
    const topNotes = tgsResult.complianceNotes.slice(0, 4)
    return (
      <g>
        <rect x={0} y={y} width={svgW} height={NOTES_H} fill="#18181b" />
        <line x1={0} y1={y} x2={svgW} y2={y} stroke="#3f3f46" strokeWidth={1} />
        {topNotes.map((n, i) => (
          <text key={i} x={16} y={y + 16 + i * 13} fill="#52525b" fontSize={8}
            fontFamily="Arial, sans-serif">
            {n}
          </text>
        ))}
        {tgsResult.warnings.map((w, i) => (
          <text key={`warn-${i}`} x={16} y={y + 16 + (topNotes.length + i) * 13}
            fill="#f97316" fontSize={8} fontFamily="Arial, sans-serif">
            ⚠ {w}
          </text>
        ))}
        {tgsResult.speedZone && (
          <text x={svgW - 16} y={y + 16} fill="#fbbf24" fontSize={9}
            fontFamily="Arial, sans-serif" textAnchor="end" fontWeight="bold">
            Speed Zone: {tgsResult.speedZone.speedKmh} km/h
            {' '}(from {Math.round(tgsResult.speedZone.startDistanceM)}m to {Math.round(tgsResult.speedZone.endDistanceM)}m)
          </text>
        )}
        {tgsResult.ttlTiming && (
          <text x={svgW - 16} y={y + 32} fill="#93c5fd" fontSize={9}
            fontFamily="Arial, sans-serif" textAnchor="end">
            TTL: Green {tgsResult.ttlTiming.greenWorkS}s / All-red {tgsResult.ttlTiming.allRedS}s / Cycle {tgsResult.ttlTiming.cycleS}s
          </text>
        )}
      </g>
    )
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflow: 'auto',
      background: '#09090b',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <svg
        viewBox={`0 0 ${svgW} ${TOTAL_H}`}
        width={svgW}
        height={TOTAL_H}
        style={{ display: 'block', minWidth: svgW }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {renderZoneBands()}
        {renderRoadLines()}
        {renderSideRoadBranches()}
        {renderSignMarkers()}
        {renderTitleBlock()}
        {renderZoneBar()}
        {renderComplianceBar()}
      </svg>
    </div>
  )
}
