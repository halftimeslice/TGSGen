import { useEffect, useMemo } from 'react'
import { useMap, AdvancedMarker } from '@vis.gl/react-google-maps'
import type { TGSResult, LatLng } from '../types'
import {
  interpolatePolyline,
  samplePolylineRange,
  bearingAtDistance,
  offsetPoint,
} from '../lib/geometry'

type Props = {
  tgsResult: TGSResult
  polyline: LatLng[]           // work zone polyline (between pins)
  extendedPolyline: LatLng[]   // full road geometry beyond pins — for curvature-correct rendering
  wzStartOffsetM: number        // distance along extendedPolyline to the work zone start
}

// Sign codes worth showing as individual map markers (skip cones — too numerous)
const MAP_SIGN_CODES = new Set([
  'T1-1', 'T1-3', 'T1-4', 'T1-6',
  'T5-2-stop', 'T5-2-slow', 'T5-2',
  'T2-6', 'T1-9', 'T1-10',
  'T5-15-left', 'T5-15-right', 'T1-34',
])

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

// Position a sign marker — uses the extended polyline so curvature is correct
function signPos(
  extPolyline: LatLng[],
  wzOffset: number,
  distM: number,
  perpSide: number,  // -1 = left, 0 = centre, 1 = right
): LatLng {
  const absM = wzOffset + distM
  const pos = interpolatePolyline(extPolyline, absM)
  if (perpSide === 0) return pos
  const bearing = bearingAtDistance(extPolyline, Math.max(0, absM))
  return offsetPoint(pos, (bearing + perpSide * 90 + 360) % 360, SIGN_OFFSET_M)
}

export function TGSMapOverlay({ tgsResult, extendedPolyline, wzStartOffsetM }: Props) {
  const map = useMap()

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

    // Main road signs
    const seen = new Set<string>()
    const result: Array<{
      key: string; pos: LatLng; code: string; approach: string; distLabel: string
    }> = []

    for (const sign of tgsResult.signs) {
      if (!MAP_SIGN_CODES.has(sign.code)) continue
      const dedupKey = `${sign.code}:${sign.approach}`
      if (seen.has(dedupKey)) continue
      seen.add(dedupKey)

      const perpSide = sign.approach === 'A' ? -1 : sign.approach === 'B' ? 1 : 0
      const pos = signPos(extendedPolyline, wzStartOffsetM, sign.distanceM, perpSide)
      const distLabel = sign.distanceM < 0
        ? `${Math.round(Math.abs(sign.distanceM))}m before`
        : `${Math.round(sign.distanceM)}m`

      result.push({
        key: `main:${sign.code}:${sign.approach}:${Math.round(sign.distanceM)}`,
        pos, code: sign.code, approach: sign.approach, distLabel,
      })
    }

    // Side road signs (Fix 2)
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
        if (!MAP_SIGN_CODES.has(sign.code)) continue
        if (seenSide.has(sign.code)) continue
        seenSide.add(sign.code)

        const absM = Math.abs(sign.distanceM)
        const pos = interpolatePolyline(oriented, absM)
        result.push({
          key: `side:${arm.wayId}:${sign.code}:${Math.round(sign.distanceM)}`,
          pos, code: sign.code, approach: 'side-road',
          distLabel: `${Math.round(absM)}m`,
        })
      }
    }

    return result
  }, [tgsResult, extendedPolyline, wzStartOffsetM])

  return (
    <>
      {markers.map(({ key, pos, code, approach, distLabel }) => {
        const bg     = APPROACH_BG[approach]    ?? '#fff'
        const border = APPROACH_BORDER[approach] ?? '#666'
        return (
          <AdvancedMarker key={key} position={pos} zIndex={10}>
            <div style={{
              background: bg,
              border: `1.5px solid ${border}`,
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
            }}>
              <div>{code}</div>
              <div style={{ fontWeight: 400, fontSize: 8, color: '#555' }}>{distLabel}</div>
            </div>
          </AdvancedMarker>
        )
      })}
    </>
  )
}
