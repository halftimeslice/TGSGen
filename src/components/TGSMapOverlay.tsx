import { useEffect, useMemo, useState } from 'react'
import { useMap, AdvancedMarker } from '@vis.gl/react-google-maps'
import type { TGSResult, LatLng } from '../types'
import { SignIcon } from './SignIcon'
import {
  interpolatePolyline,
  samplePolylineRange,
  bearingAtDistance,
  distanceAlongPolylineM,
  offsetPoint,
} from '../lib/geometry'

type Props = {
  tgsResult: TGSResult
  polyline: LatLng[]           // work zone polyline (between pins)
  extendedPolyline: LatLng[]   // full road geometry beyond pins — for curvature-correct rendering
  wzStartOffsetM: number        // distance along extendedPolyline to the work zone start
  showSignIcons: boolean        // true = draw sign pictures, false = draw sign codes
  onUpdateSign: (id: string, patch: Partial<TGSResult['signs'][number]>) => void
  onDeleteSign: (id: string) => void
}

// Taper-line delineation markers are drawn en masse, not as individual markers
function isBulkDelineation(code: string): boolean {
  return code.startsWith('T5-4') || code.startsWith('T5-5')
}

const ZONE_COLOR = {
  advance: '#3b82f6',
  taper:   '#f97316',
  wz:      '#ef4444',
  recovery:'#8b5cf6',
  sideroad:'#22d3ee',
}

const APPROACH_BG: Record<string, string> = {
  A:          '#bfdbfe',
  B:          '#bbf7d0',
  both:       '#fef9c3',
  'side-road':'#fed7aa',
}
const APPROACH_BORDER: Record<string, string> = {
  A:          '#1d4ed8',
  B:          '#15803d',
  both:       '#a16207',
  'side-road':'#c2410c',
}

const SIGN_OFFSET_M = 6 // perpendicular offset so A/B labels don't sit on the centreline
const SIGN_SPREAD_M = 4 // extra sideways gap for signs that share the same spot

// Position a sign marker — uses the extended polyline so curvature is correct.
// lateralM is signed metres perpendicular to travel (negative = left of the
// road line, positive = right).
function signPos(
  extPolyline: LatLng[],
  wzOffset: number,
  distM: number,
  lateralM: number,
): LatLng {
  const absM = wzOffset + distM
  const pos = interpolatePolyline(extPolyline, absM)
  if (lateralM === 0) return pos
  const bearing = bearingAtDistance(extPolyline, Math.max(0, absM))
  const dir = lateralM > 0 ? 1 : -1
  return offsetPoint(pos, (bearing + dir * 90 + 360) % 360, Math.abs(lateralM))
}

export function TGSMapOverlay({ tgsResult, extendedPolyline, wzStartOffsetM, showSignIcons, onUpdateSign, onDeleteSign }: Props) {
  const map = useMap()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Live distance readout for the sign currently being dragged
  const [dragging, setDragging] = useState<{ id: string; distM: number } | null>(null)

  // Snap a dragged position back onto the road: distance along the road
  // relative to the work zone start
  function snapDistM(latLng: google.maps.LatLng): number {
    const p: LatLng = { lat: latLng.lat(), lng: latLng.lng() }
    return distanceAlongPolylineM(extendedPolyline, p) - wzStartOffsetM
  }

  // ── Zone band polylines — imperative Google Maps API ─────────────────────
  useEffect(() => {
    if (!map || extendedPolyline.length < 2) return

    const cleanups: (() => void)[] = []
    const wzLen    = tgsResult.workZoneLength
    const taperLen = tgsResult.taperLength
    const advDist  = tgsResult.advanceWarning.distanceM
    const D        = tgsResult.D

    function drawZone(fromM: number, toM: number, color: string, weight: number) {
      if (toM <= fromM) return
      const span = toM - fromM
      const step = Math.max(2, span / 60)
      // Map distanceM (relative to WZ start) into absolute offset along extendedPolyline
      const pts = samplePolylineRange(
        extendedPolyline,
        wzStartOffsetM + fromM,
        wzStartOffsetM + toM,
        step,
      )
      if (pts.length < 2) return
      const pl = new google.maps.Polyline({
        path: pts.map(p => ({ lat: p.lat, lng: p.lng })),
        strokeColor: color,
        strokeOpacity: 0.85,
        strokeWeight: weight,
        map,
        zIndex: 5,
      })
      cleanups.push(() => pl.setMap(null))
    }

    // Main road TGS zones
    drawZone(-(advDist + taperLen), -taperLen, ZONE_COLOR.advance, 6)
    drawZone(-taperLen, 0,             ZONE_COLOR.taper,   8)
    drawZone(0, wzLen,                 ZONE_COLOR.wz,      10)
    drawZone(wzLen, wzLen + taperLen,  ZONE_COLOR.taper,   8)
    drawZone(wzLen + taperLen, wzLen + taperLen + advDist, ZONE_COLOR.advance, 6)
    drawZone(wzLen + taperLen, wzLen + taperLen + D, ZONE_COLOR.recovery, 5)

    // Side road advance warning zones (Fix 2)
    for (const t of tgsResult.intersectionTreatments) {
      const arm = t.arm
      if (!arm.geometry || arm.geometry.length < 2) continue
      const armAdvanceDist = arm.speedLimit <= 40 ? 40
        : arm.speedLimit <= 50 ? 60
        : arm.speedLimit <= 60 ? 80
        : arm.speedLimit <= 70 ? 100
        : arm.speedLimit <= 80 ? 150
        : arm.speedLimit <= 100 ? 200
        : 250

      // Draw a band along the side road geometry from the junction back armAdvanceDist metres
      const step = Math.max(2, armAdvanceDist / 40)
      // Arm geometry starts at its far end — find which end is the junction
      const armGeom = arm.geometry
      const connNode = arm.connectionNode
      const firstDist = Math.hypot(armGeom[0].lat - connNode.lat, armGeom[0].lng - connNode.lng)
      const lastDist  = Math.hypot(armGeom[armGeom.length - 1].lat - connNode.lat, armGeom[armGeom.length - 1].lng - connNode.lng)
      // Orient so it runs FROM the junction outward
      const oriented = firstDist > lastDist ? [...armGeom].reverse() : armGeom

      // Sample from junction (0) to armAdvanceDist metres out
      const pts = samplePolylineRange(oriented, 0, armAdvanceDist, step)
      if (pts.length >= 2) {
        const sideColor = t.treatment === 'ROAD_CLOSURE' ? '#ef4444'
          : t.treatment === 'CONTROLLER' ? '#f97316'
          : ZONE_COLOR.sideroad
        const pl = new google.maps.Polyline({
          path: pts.map(p => ({ lat: p.lat, lng: p.lng })),
          strokeColor: sideColor,
          strokeOpacity: 0.75,
          strokeWeight: 5,
          map,
          zIndex: 4,
        })
        cleanups.push(() => pl.setMap(null))
      }
    }

    return () => cleanups.forEach(fn => fn())
  }, [map, tgsResult, extendedPolyline, wzStartOffsetM])

  // ── Sign markers — React AdvancedMarker JSX ───────────────────────────────
  const markers = useMemo(() => {
    if (extendedPolyline.length < 2) return []

    // Main road signs — every sign is individually draggable/deletable
    const result: Array<{
      key: string; id: string | null; pos: LatLng; code: string; approach: string; distanceM: number
    }> = []

    // Count how many signs land on each spot so co-located ones can fan out
    const stackAt = new Map<string, number>()

    for (const sign of tgsResult.signs) {
      if (isBulkDelineation(sign.code)) continue

      const perpSide = sign.approach === 'A' ? -1 : sign.approach === 'B' ? 1 : 0
      // When several signs share the same distance + side, push each extra one
      // further out to the side so it sits beside the first, not on top of it.
      const key = `${Math.round(sign.distanceM)}:${perpSide}`
      const stackIdx = stackAt.get(key) ?? 0
      stackAt.set(key, stackIdx + 1)
      const spreadDir = perpSide === 0 ? 1 : perpSide  // centred signs fan to the right
      const lateralM = perpSide * SIGN_OFFSET_M + spreadDir * stackIdx * SIGN_SPREAD_M
      const pos = signPos(extendedPolyline, wzStartOffsetM, sign.distanceM, lateralM)

      result.push({
        key: sign.id ?? `main:${sign.code}:${sign.approach}:${Math.round(sign.distanceM)}`,
        id: sign.id ?? null,
        pos, code: sign.code, approach: sign.approach, distanceM: sign.distanceM,
      })
    }

    // Side road signs (Fix 2) — not editable yet
    for (const t of tgsResult.intersectionTreatments) {
      const arm = t.arm
      if (!arm.geometry || arm.geometry.length < 2) continue

      const armGeom = arm.geometry
      const connNode = arm.connectionNode
      const firstDist = Math.hypot(armGeom[0].lat - connNode.lat, armGeom[0].lng - connNode.lng)
      const oriented = firstDist > Math.hypot(armGeom[armGeom.length - 1].lat - connNode.lat, armGeom[armGeom.length - 1].lng - connNode.lng)
        ? [...armGeom].reverse() : armGeom

      const seenSide = new Set<string>()
      for (const sign of t.signsOnSideRoad) {
        if (isBulkDelineation(sign.code)) continue
        if (seenSide.has(sign.code)) continue
        seenSide.add(sign.code)

        const absM = Math.abs(sign.distanceM)
        const pos = interpolatePolyline(oriented, absM)
        result.push({
          key: `side:${arm.wayId}:${sign.code}:${Math.round(sign.distanceM)}`,
          id: null,
          pos, code: sign.code, approach: 'side-road', distanceM: absM,
        })
      }
    }

    return result
  }, [tgsResult, extendedPolyline, wzStartOffsetM])

  return (
    <>
      {markers.map(({ key, id, pos, code, approach, distanceM }) => {
        const bg       = APPROACH_BG[approach]    ?? '#fff'
        const border   = APPROACH_BORDER[approach] ?? '#666'
        const editable = id !== null
        const selected = editable && selectedId === id
        const liveDist = dragging && dragging.id === id ? dragging.distM : distanceM
        const distLabel = liveDist < 0
          ? `${Math.round(Math.abs(liveDist))}m before`
          : `${Math.round(liveDist)}m`

        return (
          <AdvancedMarker
            key={key}
            position={pos}
            zIndex={selected ? 20 : 10}
            draggable={editable}
            onClick={editable ? () => setSelectedId(cur => (cur === id ? null : id)) : undefined}
            onDragStart={editable ? () => { setSelectedId(id); setDragging({ id: id!, distM: distanceM }) } : undefined}
            onDrag={editable ? (e: google.maps.MapMouseEvent) => {
              if (e.latLng) setDragging({ id: id!, distM: snapDistM(e.latLng) })
            } : undefined}
            onDragEnd={editable ? (e: google.maps.MapMouseEvent) => {
              if (e.latLng) onUpdateSign(id!, { distanceM: Math.round(snapDistM(e.latLng)) })
              setDragging(null)
            } : undefined}
          >
            <div style={{ position: 'relative' }}>
              {selected && (
                <button
                  onClick={ev => { ev.stopPropagation(); setSelectedId(null); onDeleteSign(id!) }}
                  title="Remove sign"
                  style={{
                    position: 'absolute', top: -10, right: -10, zIndex: 2,
                    width: 18, height: 18, borderRadius: 9,
                    background: '#dc2626', color: '#fff', border: '1.5px solid #fff',
                    fontSize: 11, lineHeight: '14px', fontWeight: 'bold',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  ×
                </button>
              )}
              {showSignIcons ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: editable ? 'grab' : 'default',
                }}>
                  <div style={{
                    borderRadius: 5,
                    padding: 2,
                    outline: selected ? '2px solid #fbbf24' : 'none',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))',
                    lineHeight: 0,
                  }}>
                    <SignIcon code={code} px={42} />
                  </div>
                  <div style={{
                    marginTop: 1,
                    background: 'rgba(17,17,17,0.8)',
                    color: '#fff',
                    borderRadius: 3,
                    padding: '0 3px',
                    fontSize: 8,
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.4,
                  }}>{distLabel}</div>
                </div>
              ) : (
                <div style={{
                  background: bg,
                  border: `1.5px solid ${border}`,
                  outline: selected ? '2px solid #fbbf24' : 'none',
                  borderRadius: 4,
                  padding: '2px 5px',
                  fontSize: 9,
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  color: '#111',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                  lineHeight: 1.3,
                  textAlign: 'center',
                  cursor: editable ? 'grab' : 'default',
                }}>
                  <div>{code}</div>
                  <div style={{ fontWeight: 400, fontSize: 8, color: '#555' }}>{distLabel}</div>
                </div>
              )}
            </div>
          </AdvancedMarker>
        )
      })}
    </>
  )
}
