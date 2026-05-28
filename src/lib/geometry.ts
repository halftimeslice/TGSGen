import type { LatLng } from '../types'

export function haversineM(a: LatLng, b: LatLng): number {
  const R = 6_371_000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

// Returns the arc-length distance along `polyline` from its start to the nearest projected point of `point`
export function distanceAlongPolylineM(polyline: LatLng[], point: LatLng): number {
  let bestSegIdx = 0, bestT = 0, bestDist = Infinity
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i], b = polyline[i + 1]
    const dx = b.lng - a.lng, dy = b.lat - a.lat
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) continue
    const t = Math.max(0, Math.min(1, ((point.lng - a.lng) * dx + (point.lat - a.lat) * dy) / lenSq))
    const d = Math.hypot(point.lng - a.lng - t * dx, point.lat - a.lat - t * dy)
    if (d < bestDist) { bestDist = d; bestSegIdx = i; bestT = t }
  }
  let dist = 0
  for (let i = 0; i < bestSegIdx; i++) dist += haversineM(polyline[i], polyline[i + 1])
  if (bestT > 0) {
    const a = polyline[bestSegIdx], b = polyline[bestSegIdx + 1]
    dist += haversineM(a, { lat: a.lat + bestT * (b.lat - a.lat), lng: a.lng + bestT * (b.lng - a.lng) })
  }
  return dist
}

export function findJunctionPoint(polyline: LatLng[], third: LatLng): LatLng {
  let bestDist = Infinity
  let bestPoint: LatLng = polyline[0]
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i]
    const b = polyline[i + 1]
    const dx = b.lng - a.lng
    const dy = b.lat - a.lat
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) continue
    const t = Math.max(0, Math.min(1, ((third.lng - a.lng) * dx + (third.lat - a.lat) * dy) / lenSq))
    const pt: LatLng = { lat: a.lat + t * dy, lng: a.lng + t * dx }
    const d = Math.hypot(third.lat - pt.lat, third.lng - pt.lng)
    if (d < bestDist) { bestDist = d; bestPoint = pt }
  }
  return bestPoint
}

function segmentIntersect(a1: LatLng, a2: LatLng, b1: LatLng, b2: LatLng): LatLng | null {
  const dax = a2.lng - a1.lng, day = a2.lat - a1.lat
  const dbx = b2.lng - b1.lng, dby = b2.lat - b1.lat
  const denom = dax * dby - day * dbx
  if (Math.abs(denom) < 1e-12) return null
  const t = ((b1.lng - a1.lng) * dby - (b1.lat - a1.lat) * dbx) / denom
  const u = ((b1.lng - a1.lng) * day - (b1.lat - a1.lat) * dax) / denom
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return { lat: a1.lat + t * day, lng: a1.lng + t * dax }
}

export function findPolylineIntersection(poly1: LatLng[], poly2: LatLng[]): LatLng | null {
  for (let i = 0; i < poly1.length - 1; i++) {
    for (let j = 0; j < poly2.length - 1; j++) {
      const pt = segmentIntersect(poly1[i], poly1[i + 1], poly2[j], poly2[j + 1])
      if (pt) return pt
    }
  }
  return null
}

// Returns which side of the directed polyline (start→end) the branch departs from.
// Uses a 2D cross product: positive = left of travel direction, negative = right.
// Returns the compass bearing (degrees, 0=north, 90=east) from `from` to `to`
export function getBearing(from: LatLng, to: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const lat1 = toRad(from.lat), lat2 = toRad(to.lat)
  const dLng = toRad(to.lng - from.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

// Offset a LatLng point by `distanceM` metres along `bearingDeg`
export function offsetPoint(point: LatLng, bearingDeg: number, distanceM: number): LatLng {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const lat1 = toRad(point.lat), lng1 = toRad(point.lng)
  const b = toRad(bearingDeg), d = distanceM / R
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b))
  const lng2 = lng1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return { lat: toDeg(lat2), lng: toDeg(lng2) }
}

// Returns the LatLng at `distanceM` metres along `polyline`.
// Negative values extrapolate before the start; values beyond total length extrapolate past the end.
export function interpolatePolyline(polyline: LatLng[], distanceM: number): LatLng {
  if (polyline.length === 0) return { lat: 0, lng: 0 }
  if (polyline.length === 1) return polyline[0]

  if (distanceM <= 0) {
    const a = polyline[0], b = polyline[1]
    const segLen = haversineM(a, b)
    if (segLen === 0 || distanceM === 0) return a
    const t = distanceM / segLen
    return { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) }
  }

  let remaining = distanceM
  for (let i = 0; i < polyline.length - 1; i++) {
    const segLen = haversineM(polyline[i], polyline[i + 1])
    if (remaining <= segLen) {
      const t = remaining / segLen
      return {
        lat: polyline[i].lat + t * (polyline[i + 1].lat - polyline[i].lat),
        lng: polyline[i].lng + t * (polyline[i + 1].lng - polyline[i].lng),
      }
    }
    remaining -= segLen
  }

  const last = polyline.length - 1
  const a = polyline[last - 1], b = polyline[last]
  const segLen = haversineM(a, b)
  if (segLen === 0) return b
  const t = remaining / segLen
  return { lat: b.lat + t * (b.lat - a.lat), lng: b.lng + t * (b.lng - a.lng) }
}

// Samples the polyline at regular `stepM` intervals from `fromM` to `toM`
export function samplePolylineRange(polyline: LatLng[], fromM: number, toM: number, stepM: number): LatLng[] {
  const pts: LatLng[] = []
  const step = Math.max(1, stepM)
  for (let d = fromM; d < toM; d += step) pts.push(interpolatePolyline(polyline, d))
  pts.push(interpolatePolyline(polyline, toM))
  return pts
}

// Returns the forward bearing (degrees) at `distanceM` along the polyline
export function bearingAtDistance(polyline: LatLng[], distanceM: number): number {
  if (polyline.length < 2) return 0
  let remaining = Math.max(0, distanceM)
  for (let i = 0; i < polyline.length - 1; i++) {
    const segLen = haversineM(polyline[i], polyline[i + 1])
    if (remaining <= segLen || i === polyline.length - 2) {
      return getBearing(polyline[i], polyline[i + 1])
    }
    remaining -= segLen
  }
  return getBearing(polyline[polyline.length - 2], polyline[polyline.length - 1])
}

export function sideOfPolyline(
  polyline: LatLng[],
  connectionNode: LatLng,
  branchNode: LatLng,
): 'left' | 'right' {
  let bestIdx = 0
  let bestDist = Infinity
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i], b = polyline[i + 1]
    const dx = b.lng - a.lng, dy = b.lat - a.lat
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) continue
    const t = Math.max(0, Math.min(1, ((connectionNode.lng - a.lng) * dx + (connectionNode.lat - a.lat) * dy) / lenSq))
    const d = Math.hypot(connectionNode.lng - a.lng - t * dx, connectionNode.lat - a.lat - t * dy)
    if (d < bestDist) { bestDist = d; bestIdx = i }
  }
  const seg = polyline[bestIdx], segNext = polyline[bestIdx + 1]
  const pdx = segNext.lng - seg.lng, pdy = segNext.lat - seg.lat
  const bdx = branchNode.lng - connectionNode.lng, bdy = branchNode.lat - connectionNode.lat
  return pdx * bdy - pdy * bdx > 0 ? 'left' : 'right'
}
