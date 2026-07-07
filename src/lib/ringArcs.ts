// Shared roundabout-ring helpers: splitting the ring into the two arcs the
// selection corridors follow around the central island, and classifying which
// arc each arm connects to. Used by LaneSideOverlay (drawing) and aiGenerate
// (defaultClosed arm flags) so both always agree.

import type { LatLng, RingInfo } from '../types'

const EARTH_R = 6371000

// Offset a ring node radially from the ring centre: +m = outward, −m = inward
export function offsetFromCenter(node: LatLng, center: LatLng, distM: number): LatLng {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const bearing = Math.atan2(node.lng - center.lng, node.lat - center.lat)
  const d = distM / EARTH_R
  const lat1 = toRad(node.lat)
  const lng1 = toRad(node.lng)
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing))
  const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return { lat: toDeg(lat2), lng: toDeg(lng2) }
}

// Ring nodes from entry to exit. 'travel' follows the ring's stored (travel)
// direction — the path vehicles actually take; 'far' runs against it — the
// other way around the island. Both returned arrays run entry → exit.
export function ringArc(ring: RingInfo, which: 'travel' | 'far'): LatLng[] {
  const n = ring.nodes.length
  const step = which === 'travel' ? 1 : -1
  const arc: LatLng[] = [ring.nodes[ring.entryIdx]]
  for (let i = ring.entryIdx; i !== ring.exitIdx; ) {
    i = (i + step + n) % n
    arc.push(ring.nodes[i])
    if (arc.length > n + 1) break // safety on malformed rings
  }
  return arc
}

// True when the travel arc departs to the LEFT of the direction of travel at
// the ring entry. For a clockwise Australian roundabout this is the normal
// case; computed from geometry so a mis-mapped ring can't silently flip sides.
export function travelArcOnLeft(ring: RingInfo, headingFrom: LatLng, headingTo: LatLng): boolean {
  const travel = ringArc(ring, 'travel')
  const next = travel.length > 1 ? travel[1] : ring.center
  const dx = headingTo.lng - headingFrom.lng
  const dy = headingTo.lat - headingFrom.lat
  const ax = next.lng - headingTo.lng
  const ay = next.lat - headingTo.lat
  return dx * ay - dy * ax > 0
}

export type ArmRole = 'entry' | 'exit' | 'travel' | 'far'

// Which part of the ring an arm connects to: the route's entry or exit arm,
// or an unrelated arm sitting on the travel arc or the far arc.
export function classifyArm(
  ring: RingInfo,
  arm: { wayId: string; pairedWayId?: string; connectionNode: LatLng },
): ArmRole {
  const ids = [arm.wayId, arm.pairedWayId].filter(Boolean) as string[]
  if (ids.includes(ring.entryWayId)) return 'entry'
  if (ids.includes(ring.exitWayId)) return 'exit'

  let best = 0
  let bestD = Infinity
  for (let i = 0; i < ring.nodes.length; i++) {
    const d = Math.hypot(ring.nodes[i].lat - arm.connectionNode.lat, ring.nodes[i].lng - arm.connectionNode.lng)
    if (d < bestD) { bestD = d; best = i }
  }
  if (best === ring.entryIdx) return 'entry'
  if (best === ring.exitIdx) return 'exit'

  const n = ring.nodes.length
  for (let i = ring.entryIdx; i !== ring.exitIdx; ) {
    i = (i + 1) % n
    if (i === best) return 'travel'
  }
  return 'far'
}
