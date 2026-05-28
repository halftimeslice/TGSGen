import { useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import type { LatLng, PolylineSegment } from '../types'

type Props = {
  start: LatLng
  end: LatLng
  segments: PolylineSegment[] | null
  closedSide: 'left' | 'right' | null
  disabled: boolean
  roadWidth: number
  onSelectSide: (side: 'left' | 'right') => void
}

function getBearing(from: LatLng, to: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const lat1 = toRad(from.lat), lat2 = toRad(to.lat)
  const dLng = toRad(to.lng - from.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function offsetPoint(point: LatLng, bearingDeg: number, distanceM: number): LatLng {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const lat1 = toRad(point.lat), lng1 = toRad(point.lng)
  const b = toRad(bearingDeg), d = distanceM / R
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b))
  const lng2 = lng1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return { lat: toDeg(lat2), lng: toDeg(lng2) }
}

function avgBearing(b1: number, b2: number): number {
  const diff = ((b2 - b1 + 540) % 360) - 180
  return (b1 + diff / 2 + 360) % 360
}

function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat) * R
  const dLng = toRad(b.lng - a.lng) * R * Math.cos(toRad((a.lat + b.lat) / 2))
  return Math.hypot(dLat, dLng)
}

function catmullRom(p0: LatLng, p1: LatLng, p2: LatLng, p3: LatLng, t: number): LatLng {
  const t2 = t * t, t3 = t2 * t
  return {
    lat: 0.5 * ((2 * p1.lat) + (-p0.lat + p2.lat) * t + (2*p0.lat - 5*p1.lat + 4*p2.lat - p3.lat) * t2 + (-p0.lat + 3*p1.lat - 3*p2.lat + p3.lat) * t3),
    lng: 0.5 * ((2 * p1.lng) + (-p0.lng + p2.lng) * t + (2*p0.lng - 5*p1.lng + 4*p2.lng - p3.lng) * t2 + (-p0.lng + 3*p1.lng - 3*p2.lng + p3.lng) * t3),
  }
}

function turnAngle(a: LatLng, b: LatLng, c: LatLng): number {
  const v1 = { x: b.lng - a.lng, y: b.lat - a.lat }
  const v2 = { x: c.lng - b.lng, y: c.lat - b.lat }
  const mag1 = Math.hypot(v1.x, v1.y)
  const mag2 = Math.hypot(v2.x, v2.y)
  if (mag1 === 0 || mag2 === 0) return 0
  const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2)))
  return Math.acos(cos) * 180 / Math.PI
}

function splineSegment(nodes: LatLng[], stepM: number): LatLng[] {
  if (nodes.length < 2) return nodes
  const spline: LatLng[] = []
  const n = nodes.length
  for (let i = 0; i < n - 1; i++) {
    const p0 = nodes[Math.max(0, i - 1)]
    const p1 = nodes[i]
    const p2 = nodes[i + 1]
    const p3 = nodes[Math.min(n - 1, i + 2)]
    const steps = Math.max(16, Math.ceil(distanceM(p1, p2) / (stepM * 0.5)))
    for (let j = 0; j < steps; j++) spline.push(catmullRom(p0, p1, p2, p3, j / steps))
  }
  spline.push(nodes[n - 1])

  const cumDist: number[] = [0]
  for (let i = 1; i < spline.length; i++) cumDist.push(cumDist[i - 1] + distanceM(spline[i - 1], spline[i]))
  const total = cumDist[cumDist.length - 1]

  const result: LatLng[] = [nodes[0]]
  let seg = 0
  for (let d = stepM; d < total; d += stepM) {
    while (seg < spline.length - 2 && cumDist[seg + 1] <= d) seg++
    const a = spline[seg], b = spline[seg + 1]
    const segLen = cumDist[seg + 1] - cumDist[seg]
    const t = segLen > 0 ? (d - cumDist[seg]) / segLen : 0
    result.push({ lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) })
  }
  result.push(nodes[n - 1])
  return result
}

function resamplePolyline(nodes: LatLng[], stepM: number): LatLng[] {
  if (nodes.length < 2) return nodes

  const splits: number[] = [0]
  for (let i = 1; i < nodes.length - 1; i++) {
    if (turnAngle(nodes[i - 1], nodes[i], nodes[i + 1]) > 35) splits.push(i)
  }
  splits.push(nodes.length - 1)

  const result: LatLng[] = []
  for (let s = 0; s < splits.length - 1; s++) {
    const sub = nodes.slice(splits[s], splits[s + 1] + 1)
    const smoothed = splineSegment(sub, stepM)
    result.push(...(s === 0 ? smoothed : smoothed.slice(1)))
  }
  return result
}

function buildSidePolygon(nodes: LatLng[], side: 'left' | 'right', offsetM: number): LatLng[] {
  const sign = side === 'left' ? -90 : 90
  const offsets: LatLng[] = []

  for (let i = 0; i < nodes.length; i++) {
    if (nodes.length < 2) { offsets.push(nodes[i]); continue }
    if (i === 0) {
      const b = getBearing(nodes[0], nodes[1])
      offsets.push(offsetPoint(nodes[i], (b + sign + 360) % 360, offsetM))
    } else if (i === nodes.length - 1) {
      const b = getBearing(nodes[i - 1], nodes[i])
      offsets.push(offsetPoint(nodes[i], (b + sign + 360) % 360, offsetM))
    } else {
      const bIn = getBearing(nodes[i - 1], nodes[i])
      const bOut = getBearing(nodes[i], nodes[i + 1])
      offsets.push(offsetPoint(nodes[i], (avgBearing(bIn, bOut) + sign + 360) % 360, offsetM))
    }
  }

  return [...offsets, ...[...nodes].reverse()]
}

export function LaneSideOverlay({ start, end, segments, closedSide, disabled, roadWidth, onSelectSide }: Props) {
  const map = useMap()
  const cbRef = useRef(onSelectSide)
  cbRef.current = onSelectSide

  useEffect(() => {
    if (!map) return

    const activeSegments: PolylineSegment[] =
      segments && segments.length > 0 ? segments : [{ type: 'road', nodes: [start, end] }]

    const OFFSET = roadWidth / 2
    const selectable = closedSide === null && !disabled
    const cleanups: (() => void)[] = []

    function sideStyle(side: 'left' | 'right') {
      if (closedSide === null) return { fill: '#9ca3af', stroke: '#6b7280', opacity: 0.35 }
      return closedSide === side
        ? { fill: '#ef4444', stroke: '#dc2626', opacity: 0.45 }
        : { fill: '#22c55e', stroke: '#16a34a', opacity: 0.45 }
    }

    for (const seg of activeSegments) {
      if (seg.type === 'roundabout') continue

      // Road segment: normal left/right corridor
      const nodes = resamplePolyline(seg.nodes, 2)
      const lc = sideStyle('left')
      const rc = sideStyle('right')

      const leftPoly = new google.maps.Polygon({
        paths: buildSidePolygon(nodes, 'left', OFFSET),
        strokeColor: lc.stroke, strokeOpacity: 0.9, strokeWeight: 2,
        fillColor: lc.fill, fillOpacity: lc.opacity,
        map, clickable: selectable,
      })

      const rightPoly = new google.maps.Polygon({
        paths: buildSidePolygon(nodes, 'right', OFFSET),
        strokeColor: rc.stroke, strokeOpacity: 0.9, strokeWeight: 2,
        fillColor: rc.fill, fillOpacity: rc.opacity,
        map, clickable: selectable,
      })

      const centreline = new google.maps.Polyline({
        path: nodes, strokeColor: '#ffffff', strokeOpacity: 0.5, strokeWeight: 1, map,
      })

      if (selectable) {
        leftPoly.addListener('click', () => cbRef.current('left'))
        rightPoly.addListener('click', () => cbRef.current('right'))
        leftPoly.addListener('mouseover', () => leftPoly.setOptions({ fillOpacity: 0.65 }))
        leftPoly.addListener('mouseout', () => leftPoly.setOptions({ fillOpacity: lc.opacity }))
        rightPoly.addListener('mouseover', () => rightPoly.setOptions({ fillOpacity: 0.65 }))
        rightPoly.addListener('mouseout', () => rightPoly.setOptions({ fillOpacity: rc.opacity }))
      }

      cleanups.push(
        () => leftPoly.setMap(null),
        () => rightPoly.setMap(null),
        () => centreline.setMap(null),
      )
    }

    return () => cleanups.forEach(fn => fn())
  }, [map, start, end, segments, closedSide, disabled, roadWidth])

  return null
}
