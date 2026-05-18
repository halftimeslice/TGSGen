import type { LatLng, RoadData } from '../types'

export type OsmFetchResult = {
  roadData: RoadData
  polyline: LatLng[]
}

// NSW defaults by OSM highway classification (TCAW / AS 1742.3)
const NSW_DEFAULTS: Record<string, { speedLimit: number; lanes: number; width: number }> = {
  motorway:       { speedLimit: 110, lanes: 4, width: 28 },
  motorway_link:  { speedLimit:  60, lanes: 1, width:  4 },
  trunk:          { speedLimit: 100, lanes: 2, width: 10 },
  trunk_link:     { speedLimit:  60, lanes: 1, width:  4 },
  primary:        { speedLimit:  80, lanes: 2, width: 14 },
  primary_link:   { speedLimit:  60, lanes: 1, width:  4 },
  secondary:      { speedLimit:  60, lanes: 2, width:  7 },
  secondary_link: { speedLimit:  60, lanes: 1, width:  4 },
  tertiary:       { speedLimit:  60, lanes: 2, width:  7 },
  tertiary_link:  { speedLimit:  60, lanes: 1, width:  4 },
  unclassified:   { speedLimit:  60, lanes: 2, width:  6.5 },
  residential:    { speedLimit:  50, lanes: 2, width:  6.5 },
  service:        { speedLimit:  20, lanes: 1, width:  4 },
}

const AU_SPEED_TAGS: Record<string, number> = {
  'AU:urban': 50,
  'AU:rural': 100,
  'AU:motorway': 110,
  'AU:school': 40,
}

function parseSpeedLimit(raw: string | undefined, highway: string): { value: number; isDefault: boolean } {
  if (!raw) return { value: NSW_DEFAULTS[highway]?.speedLimit ?? 50, isDefault: true }
  if (AU_SPEED_TAGS[raw]) return { value: AU_SPEED_TAGS[raw], isDefault: false }
  const n = parseInt(raw.replace(/[^0-9]/g, ''), 10)
  if (!isNaN(n) && n > 0) return { value: n, isDefault: false }
  return { value: NSW_DEFAULTS[highway]?.speedLimit ?? 50, isDefault: true }
}

// Distance from point p to segment [a,b] in degrees (fine for <5 km scale)
function ptSegDist(p: LatLng, a: LatLng, b: LatLng): number {
  const dx = b.lng - a.lng
  const dy = b.lat - a.lat
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) {
    return Math.hypot(p.lng - a.lng, p.lat - a.lat)
  }
  const t = Math.max(0, Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lenSq))
  return Math.hypot(p.lng - (a.lng + t * dx), p.lat - (a.lat + t * dy))
}

function minDistToWay(point: LatLng, geom: Array<{ lat: number; lon: number }>): number {
  let best = Infinity
  for (let i = 0; i < geom.length - 1; i++) {
    const a: LatLng = { lat: geom[i].lat, lng: geom[i].lon }
    const b: LatLng = { lat: geom[i + 1].lat, lng: geom[i + 1].lon }
    const d = ptSegDist(point, a, b)
    if (d < best) best = d
  }
  return best
}

// Clip the OSM way geometry to just the portion between the two pins
function trimPolyline(geom: LatLng[], start: LatLng, end: LatLng): LatLng[] {
  if (geom.length < 2) return [start, end]

  let bestStartIdx = 0, bestStartT = 0, bestStartDist = Infinity
  let bestEndIdx = 0, bestEndT = 0, bestEndDist = Infinity

  for (let i = 0; i < geom.length - 1; i++) {
    const a = geom[i]
    const b = geom[i + 1]
    const dx = b.lng - a.lng
    const dy = b.lat - a.lat
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) continue

    for (const [pin, tracking] of [
      [start, { idx: bestStartIdx, t: bestStartT, dist: bestStartDist }],
      [end,   { idx: bestEndIdx,   t: bestEndT,   dist: bestEndDist   }],
    ] as const) {
      const t = Math.max(0, Math.min(1, ((pin.lng - a.lng) * dx + (pin.lat - a.lat) * dy) / lenSq))
      const d = Math.hypot(pin.lng - (a.lng + t * dx), pin.lat - (a.lat + t * dy))
      if (pin === start && d < bestStartDist) { bestStartDist = d; bestStartIdx = i; bestStartT = t }
      if (pin === end   && d < bestEndDist)   { bestEndDist   = d; bestEndIdx   = i; bestEndT   = t }
    }
  }

  // Ensure start index comes before end index
  let [fromIdx, fromT, toIdx, toT] = bestStartIdx <= bestEndIdx
    ? [bestStartIdx, bestStartT, bestEndIdx, bestEndT]
    : [bestEndIdx, bestEndT, bestStartIdx, bestStartT]

  const trimmed: LatLng[] = []

  // Interpolated start point
  const s0 = geom[fromIdx], s1 = geom[fromIdx + 1] ?? geom[fromIdx]
  trimmed.push({ lat: s0.lat + fromT * (s1.lat - s0.lat), lng: s0.lng + fromT * (s1.lng - s0.lng) })

  // Interior nodes
  for (let i = fromIdx + 1; i <= toIdx; i++) trimmed.push(geom[i])

  // Interpolated end point
  if (toIdx < geom.length - 1) {
    const e0 = geom[toIdx], e1 = geom[toIdx + 1]
    const ep = { lat: e0.lat + toT * (e1.lat - e0.lat), lng: e0.lng + toT * (e1.lng - e0.lng) }
    if (Math.hypot(ep.lat - trimmed[trimmed.length - 1].lat, ep.lng - trimmed[trimmed.length - 1].lng) > 1e-8) {
      trimmed.push(ep)
    }
  }

  return trimmed.length >= 2 ? trimmed : [start, end]
}

export async function fetchRoadData(
  start: LatLng,
  end: LatLng,
  signal?: AbortSignal,
): Promise<OsmFetchResult> {
  const query = `
    [out:json][timeout:15];
    (
      way(around:50,${start.lat},${start.lng})[highway~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|service)$"];
      way(around:50,${end.lat},${end.lng})[highway~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|service)$"];
    );
    out geom tags;
  `

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal,
  })

  if (!res.ok) throw new Error(`Overpass error ${res.status}`)

  const json = await res.json()
  const elements: any[] = json.elements ?? []

  if (elements.length === 0) throw new Error('No road found near selected points')

  // Pick the way whose geometry passes closest to both pins
  let bestWay = elements[0]
  let bestScore = Infinity
  for (const way of elements) {
    if (!way.geometry || way.geometry.length < 2) continue
    const score = minDistToWay(start, way.geometry) + minDistToWay(end, way.geometry)
    if (score < bestScore) { bestScore = score; bestWay = way }
  }

  const tags = bestWay.tags ?? {}
  const highway: string = tags.highway ?? 'residential'
  const defaults = NSW_DEFAULTS[highway] ?? NSW_DEFAULTS.residential

  const speed = parseSpeedLimit(tags.maxspeed, highway)
  const lanesRaw = tags.lanes ? parseInt(tags.lanes, 10) : NaN
  const lanes = !isNaN(lanesRaw) && lanesRaw > 0 ? lanesRaw : defaults.lanes
  const widthRaw = tags.width ? parseFloat(tags.width) : NaN
  const width = !isNaN(widthRaw) && widthRaw > 0 ? widthRaw : defaults.width
  const surface: string = tags.surface ?? ''

  const fullPolyline: LatLng[] = (bestWay.geometry ?? []).map(
    (n: { lat: number; lon: number }) => ({ lat: n.lat, lng: n.lon }),
  )
  const polyline = trimPolyline(fullPolyline, start, end)

  const roadData: RoadData = {
    osmWayId: String(bestWay.id),
    name: tags.name ?? null,
    classification: highway,
    speedLimit: speed.value,
    lanes,
    width,
    surface,
    defaults: {
      speedLimit: speed.isDefault,
      lanes: isNaN(lanesRaw) || lanesRaw <= 0,
      width: isNaN(widthRaw) || widthRaw <= 0,
      surface: !tags.surface,
    },
  }

  return { roadData, polyline }
}
