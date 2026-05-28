import type { LatLng, RoadData, PolylineSegment, RoundaboutData, RoundaboutArm, IntersectionArm } from '../types'
import { distanceAlongPolylineM, findPolylineIntersection, sideOfPolyline, haversineM } from './geometry'

export type OsmFetchResult = {
  roadData: RoadData
  polyline: LatLng[]
  segments: PolylineSegment[]
  wayIds: string[]
  roundaboutWayId: string | null
  extendedPolyline: LatLng[]   // full road geometry beyond pins — follows actual curvature
  wzStartOffsetM: number        // metres from extendedPolyline[0] to work zone start
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

const HIGHWAY_RE = '^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|service)$'

function parseSpeedLimit(raw: string | undefined, highway: string): { value: number; isDefault: boolean } {
  if (!raw) return { value: NSW_DEFAULTS[highway]?.speedLimit ?? 50, isDefault: true }
  if (AU_SPEED_TAGS[raw]) return { value: AU_SPEED_TAGS[raw], isDefault: false }
  const n = parseInt(raw.replace(/[^0-9]/g, ''), 10)
  if (!isNaN(n) && n > 0) return { value: n, isDefault: false }
  return { value: NSW_DEFAULTS[highway]?.speedLimit ?? 50, isDefault: true }
}

function ptSegDist(p: LatLng, a: LatLng, b: LatLng): number {
  const dx = b.lng - a.lng
  const dy = b.lat - a.lat
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.lng - a.lng, p.lat - a.lat)
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

// Clip OSM way geometry to just the portion between two pins.
// Returns nodes in the way's natural order (low-index → high-index).
export function trimPolyline(geom: LatLng[], start: LatLng, end: LatLng): LatLng[] {
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

    const tS = Math.max(0, Math.min(1, ((start.lng - a.lng) * dx + (start.lat - a.lat) * dy) / lenSq))
    const dS = Math.hypot(start.lng - (a.lng + tS * dx), start.lat - (a.lat + tS * dy))
    if (dS < bestStartDist) { bestStartDist = dS; bestStartIdx = i; bestStartT = tS }

    const tE = Math.max(0, Math.min(1, ((end.lng - a.lng) * dx + (end.lat - a.lat) * dy) / lenSq))
    const dE = Math.hypot(end.lng - (a.lng + tE * dx), end.lat - (a.lat + tE * dy))
    if (dE < bestEndDist) { bestEndDist = dE; bestEndIdx = i; bestEndT = tE }
  }

  let [fromIdx, fromT, toIdx, toT] = bestStartIdx <= bestEndIdx
    ? [bestStartIdx, bestStartT, bestEndIdx, bestEndT]
    : [bestEndIdx, bestEndT, bestStartIdx, bestStartT]

  const trimmed: LatLng[] = []

  const s0 = geom[fromIdx], s1 = geom[fromIdx + 1] ?? geom[fromIdx]
  trimmed.push({ lat: s0.lat + fromT * (s1.lat - s0.lat), lng: s0.lng + fromT * (s1.lng - s0.lng) })

  for (let i = fromIdx + 1; i <= toIdx; i++) trimmed.push(geom[i])

  if (toIdx < geom.length - 1) {
    const e0 = geom[toIdx], e1 = geom[toIdx + 1]
    const ep = { lat: e0.lat + toT * (e1.lat - e0.lat), lng: e0.lng + toT * (e1.lng - e0.lng) }
    if (Math.hypot(ep.lat - trimmed[trimmed.length - 1].lat, ep.lng - trimmed[trimmed.length - 1].lng) > 1e-8) {
      trimmed.push(ep)
    }
  }

  return trimmed.length >= 2 ? trimmed : [start, end]
}

// Like trimPolyline but guarantees the result runs from → to (reverses if needed).
function trimTowards(geom: LatLng[], from: LatLng, to: LatLng): LatLng[] {
  const seg = trimPolyline(geom, from, to)
  if (seg.length === 0) return [from, to]
  const firstDist = Math.hypot(seg[0].lat - from.lat, seg[0].lng - from.lng)
  const lastDist  = Math.hypot(seg[seg.length - 1].lat - from.lat, seg[seg.length - 1].lng - from.lng)
  return firstDist <= lastDist ? seg : [...seg].reverse()
}

// Find the first node shared between two way geometries (within ~1 m tolerance).
function findSharedNode(
  geomA: Array<{ lat: number; lon: number }>,
  geomB: Array<{ lat: number; lon: number }>,
): { lat: number; lon: number } | null {
  const TOLERANCE = 1e-5
  for (const a of geomA) {
    for (const b of geomB) {
      if (Math.abs(a.lat - b.lat) < TOLERANCE && Math.abs(a.lon - b.lon) < TOLERANCE) return a
    }
  }
  return null
}

function overpassPost(query: string, signal?: AbortSignal): Promise<Response> {
  return fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal,
  })
}

// ─── Extended-polyline helpers ───────────────────────────────────────────────

// Find where `point` projects onto `geom`, returning segment index + fractional t
function snapOnGeom(geom: LatLng[], point: LatLng): { idx: number; t: number } {
  let bestIdx = 0, bestT = 0, bestDist = Infinity
  for (let i = 0; i < geom.length - 1; i++) {
    const a = geom[i], b = geom[i + 1]
    const dx = b.lng - a.lng, dy = b.lat - a.lat
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) continue
    const t = Math.max(0, Math.min(1, ((point.lng - a.lng) * dx + (point.lat - a.lat) * dy) / lenSq))
    const d = Math.hypot(point.lng - (a.lng + t * dx), point.lat - (a.lat + t * dy))
    if (d < bestDist) { bestDist = d; bestIdx = i; bestT = t }
  }
  return { idx: bestIdx, t: bestT }
}

// Cumulative haversine distance from geom[0] to the snap point at idx/t
function distToSnap(geom: LatLng[], idx: number, t: number): number {
  let dist = 0
  for (let i = 0; i < idx; i++) dist += haversineM(geom[i], geom[i + 1])
  if (t > 0 && idx < geom.length - 1) {
    const a = geom[idx], b = geom[idx + 1]
    dist += haversineM(a, { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) })
  }
  return dist
}

// Orient `geom` so that `from` snaps earlier than `to` in the returned array
function orientGeom(geom: LatLng[], from: LatLng, to: LatLng): LatLng[] {
  const sf = snapOnGeom(geom, from)
  const st = snapOnGeom(geom, to)
  const fromBeforeTo = sf.idx < st.idx || (sf.idx === st.idx && sf.t <= st.t)
  return fromBeforeTo ? geom : [...geom].reverse()
}

// All nodes of `geom` from the beginning up to and including the snap of `point`
function nodesUpTo(geom: LatLng[], point: LatLng): LatLng[] {
  const { idx, t } = snapOnGeom(geom, point)
  const a = geom[idx], b = (geom[idx + 1] ?? geom[idx])
  const snap: LatLng = { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) }
  const nodes = [...geom.slice(0, idx + 1)]
  if (Math.hypot(snap.lat - nodes[nodes.length - 1].lat, snap.lng - nodes[nodes.length - 1].lng) > 1e-8) {
    nodes.push(snap)
  }
  return nodes
}

// All nodes of `geom` from the snap of `point` to the end
function nodesFrom(geom: LatLng[], point: LatLng): LatLng[] {
  const { idx, t } = snapOnGeom(geom, point)
  const a = geom[idx], b = (geom[idx + 1] ?? geom[idx])
  const snap: LatLng = { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) }
  return [snap, ...geom.slice(idx + 1)]
}

function polylineLenM(pts: LatLng[]): number {
  let len = 0
  for (let i = 0; i < pts.length - 1; i++) len += haversineM(pts[i], pts[i + 1])
  return len
}

// ─── fetchRoadData ────────────────────────────────────────────────────────────

export async function fetchRoadData(
  start: LatLng,
  end: LatLng,
  signal?: AbortSignal,
): Promise<OsmFetchResult> {
  const query = `
    [out:json][timeout:15];
    (
      way(around:50,${start.lat},${start.lng})[highway~"${HIGHWAY_RE}"];
      way(around:50,${end.lat},${end.lng})[highway~"${HIGHWAY_RE}"];
    );
    out geom tags;
  `
  const res = await overpassPost(query, signal)
  if (!res.ok) throw new Error(`Overpass error ${res.status}`)
  const json = await res.json()
  const elements: any[] = json.elements ?? []
  if (elements.length === 0) throw new Error('No road found near selected points')

  // Pick the best way for start and end independently
  let startWay = elements[0], startBest = Infinity
  let endWay   = elements[0], endBest   = Infinity
  for (const way of elements) {
    if (!way.geometry || way.geometry.length < 2) continue
    const sd = minDistToWay(start, way.geometry)
    if (sd < startBest) { startBest = sd; startWay = way }
    const ed = minDistToWay(end, way.geometry)
    if (ed < endBest) { endBest = ed; endWay = way }
  }

  // Road metadata comes from the start way
  const tags     = startWay.tags ?? {}
  const highway: string = tags.highway ?? 'residential'
  const defaults = NSW_DEFAULTS[highway] ?? NSW_DEFAULTS.residential
  const speed    = parseSpeedLimit(tags.maxspeed, highway)
  const lanesRaw = tags.lanes ? parseInt(tags.lanes, 10) : NaN
  const widthRaw = tags.width ? parseFloat(tags.width)  : NaN
  const lanes    = !isNaN(lanesRaw) && lanesRaw > 0 ? lanesRaw : defaults.lanes
  const width    = !isNaN(widthRaw) && widthRaw > 0 ? widthRaw : defaults.width

  const roadData: RoadData = {
    osmWayId: String(startWay.id),
    name: tags.name ?? null,
    classification: highway,
    speedLimit: speed.value,
    lanes,
    width,
    surface: tags.surface ?? '',
    defaults: {
      speedLimit: speed.isDefault,
      lanes: isNaN(lanesRaw) || lanesRaw <= 0,
      width: isNaN(widthRaw) || widthRaw <= 0,
      surface: !tags.surface,
    },
  }

  // Build polyline — stitch one or two ways
  let polyline: LatLng[]
  let extendedPolyline: LatLng[]
  let wzStartOffsetM: number
  const wayIds: string[] = []

  if (startWay.id === endWay.id) {
    const geom: LatLng[] = startWay.geometry.map((n: any) => ({ lat: n.lat, lng: n.lon }))
    polyline = trimPolyline(geom, start, end)
    wayIds.push(String(startWay.id))

    // Extended polyline = full way geometry in start→end direction
    const oriented = orientGeom(geom, start, end)
    const { idx, t } = snapOnGeom(oriented, start)
    wzStartOffsetM = distToSnap(oriented, idx, t)
    extendedPolyline = oriented
  } else {
    const corner = findSharedNode(startWay.geometry, endWay.geometry)
    if (corner) {
      const startGeom: LatLng[] = startWay.geometry.map((n: any) => ({ lat: n.lat, lng: n.lon }))
      const endGeom:   LatLng[] = endWay.geometry.map((n: any)   => ({ lat: n.lat, lng: n.lon }))
      const cornerLL: LatLng = { lat: corner.lat, lng: corner.lon }
      const startSeg = trimTowards(startGeom, start, cornerLL)
      const endSeg   = trimTowards(endGeom,   cornerLL, end)
      polyline = [...startSeg, ...endSeg.slice(1)]

      // Extended: full startWay (oriented start→corner) + full endWay (oriented corner→end)
      const startOriented = orientGeom(startGeom, start, cornerLL)
      const endOriented   = orientGeom(endGeom,   cornerLL, end)
      const approach  = nodesUpTo(startOriented, start)  // road before start pin
      const extension = nodesFrom(endOriented, end)       // road after end pin
      extendedPolyline = [...approach, ...polyline.slice(1), ...extension.slice(1)]
      wzStartOffsetM   = polylineLenM(approach)
    } else {
      // Ways don't share a node — fall back to start way
      const geom: LatLng[] = startWay.geometry.map((n: any) => ({ lat: n.lat, lng: n.lon }))
      polyline = trimPolyline(geom, start, end)
      const oriented = orientGeom(geom, start, end)
      const { idx, t } = snapOnGeom(oriented, start)
      wzStartOffsetM = distToSnap(oriented, idx, t)
      extendedPolyline = oriented
    }
    wayIds.push(String(startWay.id), String(endWay.id))
  }

  const roundaboutEl = elements.find((e: any) => e.tags?.junction === 'roundabout') ?? null
  const roundaboutWayId = roundaboutEl ? String(roundaboutEl.id) : null
  const segments: PolylineSegment[] = [{ type: 'road', nodes: polyline }]

  return { roadData, polyline, segments, wayIds, roundaboutWayId, extendedPolyline, wzStartOffsetM }
}

// ─── Roundabout helpers ───────────────────────────────────────────────────────

// Group one-way entry+exit pairs into a single logical arm.
//
// Pass 1 — same name: if two one-way ways share the same street name and have
//   opposite directions (one entry, one exit), they are the same physical road.
//   Their connection node becomes the midpoint of the two ring nodes.
//
// Pass 2 — two-way arms: added directly, no grouping needed.
//
// Pass 3 — leftover one-ways: if exactly one unmatched entry and one unmatched
//   exit remain after passes 1 & 2, they must be the same arm (process of
//   elimination). Pair them with a midpoint node.
//
// Pass 4 — anything still unmatched: add as-is (shouldn't normally happen).
function groupArms(arms: RoundaboutArm[], center: LatLng): RoundaboutArm[] {
  const result: RoundaboutArm[] = []
  const used = new Set<string>()

  // Pass 1: pair same-name one-way entry + exit
  for (const arm of arms) {
    if (used.has(arm.wayId)) continue
    if (!arm.isOneWay || !arm.name) continue

    const pair = arms.find(other =>
      !used.has(other.wayId) &&
      other.wayId !== arm.wayId &&
      other.isOneWay &&
      other.name === arm.name &&
      other.oneWayDir !== arm.oneWayDir,
    )

    if (pair) {
      const mid: LatLng = {
        lat: (arm.connectionNode.lat + pair.connectionNode.lat) / 2,
        lng: (arm.connectionNode.lng + pair.connectionNode.lng) / 2,
      }
      result.push({
        ...arm,
        connectionNode: mid,
        pairedWayId: pair.wayId,
        angleFromCenter: Math.atan2(mid.lng - center.lng, mid.lat - center.lat) * 180 / Math.PI,
      })
      used.add(arm.wayId)
      used.add(pair.wayId)
    }
  }

  // Pass 2: two-way arms go straight through
  for (const arm of arms) {
    if (used.has(arm.wayId)) continue
    if (!arm.isOneWay) {
      result.push(arm)
      used.add(arm.wayId)
    }
  }

  // Pass 3: exactly one unmatched entry + one unmatched exit left → same arm
  const leftoverEntry = arms.filter(a => !used.has(a.wayId) && a.oneWayDir === 'entry')
  const leftoverExit  = arms.filter(a => !used.has(a.wayId) && a.oneWayDir === 'exit')

  if (leftoverEntry.length === 1 && leftoverExit.length === 1) {
    const entry = leftoverEntry[0]
    const exit  = leftoverExit[0]
    const mid: LatLng = {
      lat: (entry.connectionNode.lat + exit.connectionNode.lat) / 2,
      lng: (entry.connectionNode.lng + exit.connectionNode.lng) / 2,
    }
    result.push({
      ...entry,
      name: entry.name ?? exit.name,   // prefer the named one
      connectionNode: mid,
      pairedWayId: exit.wayId,
      angleFromCenter: Math.atan2(mid.lng - center.lng, mid.lat - center.lat) * 180 / Math.PI,
    })
    used.add(entry.wayId)
    used.add(exit.wayId)
  }

  // Pass 4: anything still unmatched — add as-is
  for (const arm of arms) {
    if (!used.has(arm.wayId)) {
      result.push(arm)
      used.add(arm.wayId)
    }
  }

  result.sort((a, b) => a.angleFromCenter - b.angleFromCenter)
  return result
}

// Max distance (degrees) from an arm node to the ring polyline for a
// proximity-only connection to count (~20 m at Australian latitudes).
const PROX_SNAP_DEG = 0.00018

async function buildRoundaboutData(rabWay: any, signal?: AbortSignal): Promise<RoundaboutData | null> {
  const rabGeom: LatLng[] = (rabWay.geometry ?? []).map((n: any) => ({ lat: n.lat, lng: n.lon }))
  if (rabGeom.length < 3) return null

  const center: LatLng = {
    lat: rabGeom.reduce((s, n) => s + n.lat, 0) / rabGeom.length,
    lng: rabGeom.reduce((s, n) => s + n.lng, 0) / rabGeom.length,
  }

  // Ring radius in metres — used to size the proximity search area
  const ringRadiusM = rabGeom.reduce((s, n) => {
    const dlat = (n.lat - center.lat) * 111320
    const dlng = (n.lng - center.lng) * 111320 * Math.cos(center.lat * Math.PI / 180)
    return s + Math.hypot(dlat, dlng)
  }, 0) / rabGeom.length
  const searchRadiusM = Math.round(ringRadiusM + 60)

  // ── Run both queries in parallel ─────────────────────────────────────────
  // Query 1: exact — ways that share an OSM node with the ring (always reliable)
  // Query 2: proximity — all highway ways within searchRadiusM of center
  //   (catches arms not topologically connected to the ring in OSM)
  const [exactRes, proximityRes] = await Promise.all([
    overpassPost(`
      [out:json][timeout:15];
      way(${rabWay.id}) -> .rab;
      node(w.rab) -> .rabnodes;
      way(bn.rabnodes)[highway][junction!=roundabout];
      out geom tags;
    `, signal),
    overpassPost(`
      [out:json][timeout:15];
      way(around:${searchRadiusM},${center.lat},${center.lng})[highway~"${HIGHWAY_RE}"][junction!=roundabout];
      out geom tags;
    `, signal),
  ])
  if (!exactRes.ok)     throw new Error(`Overpass error ${exactRes.status}`)
  if (!proximityRes.ok) throw new Error(`Overpass error ${proximityRes.status}`)

  const exactWays: any[]     = (await exactRes.json()).elements     ?? []
  const proximityWays: any[] = (await proximityRes.json()).elements ?? []

  // Merge: exact ways first, then any proximity-only ways not already found
  const exactIds = new Set(exactWays.map((w: any) => String(w.id)))
  const allWays  = [
    ...exactWays,
    ...proximityWays.filter((w: any) => !exactIds.has(String(w.id))),
  ]

  // ── Build arms ───────────────────────────────────────────────────────────
  const arms: RoundaboutArm[] = []
  for (const armWay of allWays) {
    if (!armWay.geometry || armWay.geometry.length < 2) continue
    const armGeom: Array<{ lat: number; lon: number }> = armWay.geometry

    // Try exact shared node first
    let shared: { lat: number; lon: number } | null = findSharedNode(rabWay.geometry, armGeom)

    // Proximity fallback: find the arm node closest to the ring polyline
    if (!shared) {
      let bestDist = PROX_SNAP_DEG
      for (const node of armGeom) {
        const d = minDistToWay({ lat: node.lat, lng: node.lon }, rabWay.geometry)
        if (d < bestDist) { bestDist = d; shared = node }
      }
    }

    if (!shared) continue

    const connectionNode: LatLng = { lat: shared.lat, lng: shared.lon }
    const angleFromCenter = Math.atan2(
      connectionNode.lng - center.lng,
      connectionNode.lat - center.lat,
    ) * 180 / Math.PI

    const armTags     = armWay.tags ?? {}
    const armHighway: string = armTags.highway ?? 'residential'
    const armDef      = NSW_DEFAULTS[armHighway] ?? NSW_DEFAULTS.residential
    const armSpeed    = parseSpeedLimit(armTags.maxspeed, armHighway)
    const armLanesRaw = armTags.lanes ? parseInt(armTags.lanes, 10) : NaN
    const isOneWay    = armTags.oneway === 'yes' || armTags.oneway === '1'

    let oneWayDir: 'entry' | 'exit' | null = null
    if (isOneWay) {
      const first = armGeom[0]
      const firstIsConn = Math.abs(first.lat - shared.lat) < 1e-5 && Math.abs(first.lon - shared.lon) < 1e-5
      oneWayDir = firstIsConn ? 'exit' : 'entry'
    }

    arms.push({
      wayId: String(armWay.id),
      name: armTags.name ?? null,
      lanes: !isNaN(armLanesRaw) && armLanesRaw > 0 ? armLanesRaw : armDef.lanes,
      speedLimit: armSpeed.value,
      speedLimitIsDefault: armSpeed.isDefault,
      isOneWay,
      oneWayDir,
      connectionNode,
      angleFromCenter,
    })
  }

  if (arms.length === 0) return null
  return { type: 'full', wayId: String(rabWay.id), center, nodes: rabGeom, arms: groupArms(arms, center) }
}

// ─── Mini-roundabout helpers ──────────────────────────────────────────────────

// Build RoundaboutData for a highway=mini_roundabout OSM node.
// Arms are found by querying all ways that share this node.
// There is no ring geometry — the overlay synthesises a fixed-radius circle.
async function buildMiniRoundaboutData(miniNode: any, signal?: AbortSignal): Promise<RoundaboutData | null> {
  const center: LatLng = { lat: miniNode.lat, lng: miniNode.lon }

  const query = `
    [out:json][timeout:15];
    node(${miniNode.id}) -> .mini;
    way(bn.mini)[highway];
    out geom tags;
  `
  const res = await overpassPost(query, signal)
  if (!res.ok) throw new Error(`Overpass error ${res.status}`)
  const json = await res.json()
  const armWays: any[] = json.elements ?? []

  const arms: RoundaboutArm[] = []
  for (const armWay of armWays) {
    if (!armWay.geometry || armWay.geometry.length < 2) continue
    const armGeom: Array<{ lat: number; lon: number }> = armWay.geometry

    // The connection node is the arm node closest to the mini_roundabout node
    let shared: { lat: number; lon: number } | null = null
    let minDist = Infinity
    for (const n of armGeom) {
      const d = Math.hypot(n.lat - miniNode.lat, n.lon - miniNode.lon)
      if (d < minDist) { minDist = d; shared = n }
    }
    if (!shared || minDist > 1e-4) continue  // not actually connected

    const connectionNode: LatLng = { lat: shared.lat, lng: shared.lon }
    const angleFromCenter = Math.atan2(
      connectionNode.lng - center.lng,
      connectionNode.lat - center.lat,
    ) * 180 / Math.PI

    const armTags      = armWay.tags ?? {}
    const armHighway: string = armTags.highway ?? 'residential'
    const armDef       = NSW_DEFAULTS[armHighway] ?? NSW_DEFAULTS.residential
    const armSpeed     = parseSpeedLimit(armTags.maxspeed, armHighway)
    const armLanesRaw  = armTags.lanes ? parseInt(armTags.lanes, 10) : NaN
    const isOneWay     = armTags.oneway === 'yes' || armTags.oneway === '1'

    let oneWayDir: 'entry' | 'exit' | null = null
    if (isOneWay) {
      const first = armGeom[0]
      const firstIsConn = Math.abs(first.lat - shared.lat) < 1e-5 && Math.abs(first.lon - shared.lon) < 1e-5
      oneWayDir = firstIsConn ? 'exit' : 'entry'
    }

    arms.push({
      wayId: String(armWay.id),
      name: armTags.name ?? null,
      lanes: !isNaN(armLanesRaw) && armLanesRaw > 0 ? armLanesRaw : armDef.lanes,
      speedLimit: armSpeed.value,
      speedLimitIsDefault: armSpeed.isDefault,
      isOneWay,
      oneWayDir,
      connectionNode,
      angleFromCenter,
    })
  }

  if (arms.length === 0) return null
  const groupedArms = groupArms(arms, center)

  return {
    type: 'mini',
    wayId: String(miniNode.id),  // node ID stored in wayId field
    center,
    nodes: [],                   // no ring geometry; overlay synthesises a circle
    arms: groupedArms,
  }
}

export async function fetchRoundaboutByPoint(
  point: LatLng,
  signal?: AbortSignal,
): Promise<RoundaboutData | null> {
  // 1. Try full roundabout (junction=roundabout way)
  const query = `[out:json][timeout:15]; way(around:100,${point.lat},${point.lng})[junction=roundabout]; out geom tags;`
  const res = await overpassPost(query, signal)
  if (!res.ok) throw new Error(`Overpass error ${res.status}`)
  const json = await res.json()
  const elements: any[] = json.elements ?? []

  if (elements.length > 0) {
    let best = elements[0], bestDist = Infinity
    for (const e of elements) {
      if (!e.geometry) continue
      const d = minDistToWay(point, e.geometry)
      if (d < bestDist) { bestDist = d; best = e }
    }
    return buildRoundaboutData(best, signal)
  }

  // 2. Fallback: try mini_roundabout node within 50 m
  const miniQuery = `[out:json][timeout:15]; node(around:50,${point.lat},${point.lng})[highway=mini_roundabout]; out;`
  const miniRes = await overpassPost(miniQuery, signal)
  if (!miniRes.ok) throw new Error(`Overpass error ${miniRes.status}`)
  const miniJson = await miniRes.json()
  const miniElements: any[] = miniJson.elements ?? []
  if (miniElements.length === 0) return null

  let bestMini = miniElements[0], bestMiniDist = Infinity
  for (const e of miniElements) {
    const d = Math.hypot(e.lat - point.lat, e.lon - point.lng)
    if (d < bestMiniDist) { bestMiniDist = d; bestMini = e }
  }
  return buildMiniRoundaboutData(bestMini, signal)
}

export async function fetchRoundaboutArms(
  wayId: string,
  signal?: AbortSignal,
): Promise<RoundaboutData> {
  const query = `[out:json][timeout:15]; way(${wayId}); out geom tags;`
  const res = await overpassPost(query, signal)
  if (!res.ok) throw new Error(`Overpass error ${res.status}`)
  const json = await res.json()
  const elements: any[] = json.elements ?? []
  if (elements.length === 0) throw new Error('Roundabout way not found')
  const result = await buildRoundaboutData(elements[0], signal)
  if (!result) throw new Error('Could not build roundabout data')
  return result
}

// ─── fetchIntersectingRoads ───────────────────────────────────────────────────

export async function fetchIntersectingRoads(
  excludeWayIds: string[],
  polyline: LatLng[],          // work zone polyline — used for joinSide calculation
  signal?: AbortSignal,
  extendedPolyline?: LatLng[], // full corridor including advance warning zones (Fix 3)
  wzStartOffsetM?: number,     // offset of WZ start within extendedPolyline
): Promise<IntersectionArm[]> {
  if (polyline.length < 2) return []

  // Use the extended polyline bbox for a wider search corridor
  const searchPoly = extendedPolyline && extendedPolyline.length >= 2 ? extendedPolyline : polyline
  const lats = searchPoly.map(p => p.lat)
  const lngs = searchPoly.map(p => p.lng)
  const minLat = Math.min(...lats) - 0.0002
  const maxLat = Math.max(...lats) + 0.0002
  const minLng = Math.min(...lngs) - 0.0002
  const maxLng = Math.max(...lngs) + 0.0002

  const query = `
    [out:json][timeout:15];
    way(${minLat},${minLng},${maxLat},${maxLng})[highway~"${HIGHWAY_RE}"][junction!=roundabout];
    out geom tags;
  `
  const res = await overpassPost(query, signal)
  if (!res.ok) throw new Error(`Overpass error ${res.status}`)
  const json = await res.json()
  const elements: any[] = json.elements ?? []

  const excludeSet = new Set(excludeWayIds)
  const SNAP_DEG = 0.0002  // ~20 m

  const arms: IntersectionArm[] = []
  for (const way of elements) {
    if (excludeSet.has(String(way.id))) continue
    if (!way.geometry || way.geometry.length < 2) continue

    const armGeom: LatLng[] = way.geometry.map((n: any) => ({ lat: n.lat, lng: n.lon }))

    // Find the arm node closest to the main polyline
    let connectionNode: LatLng | null = null
    let minDist = SNAP_DEG
    for (const node of armGeom) {
      for (let i = 0; i < polyline.length - 1; i++) {
        const d = ptSegDist(node, polyline[i], polyline[i + 1])
        if (d < minDist) { minDist = d; connectionNode = node }
      }
    }

    // Also catch roads that cross diagonally without a shared endpoint
    if (!connectionNode) {
      const crossPt = findPolylineIntersection(polyline, armGeom)
      if (crossPt) connectionNode = crossPt
    }
    if (!connectionNode) continue

    const armTags     = way.tags ?? {}
    const armHighway: string = armTags.highway ?? 'residential'
    const armDef      = NSW_DEFAULTS[armHighway] ?? NSW_DEFAULTS.residential
    const armSpeed    = parseSpeedLimit(armTags.maxspeed, armHighway)
    const armLanesRaw = armTags.lanes ? parseInt(armTags.lanes, 10) : NaN

    const farNode = armGeom.find(n =>
      Math.hypot(n.lat - connectionNode!.lat, n.lng - connectionNode!.lng) > 1e-6,
    ) ?? armGeom[armGeom.length - 1]

    // Compute distance along work zone — use extended polyline for accuracy (handles arms
    // outside the WZ pins), then subtract the WZ start offset to get a signed distance
    // where 0 = WZ start, negative = before WZ, positive = inside or beyond WZ.
    const distAlongWzM = extendedPolyline && wzStartOffsetM !== undefined
      ? Math.round(distanceAlongPolylineM(extendedPolyline, connectionNode) - wzStartOffsetM)
      : Math.round(distanceAlongPolylineM(polyline, connectionNode))

    // joinSide is relative to the work zone polyline direction
    const joinPolyline = extendedPolyline ?? polyline
    arms.push({
      wayId: String(way.id),
      name: armTags.name ?? null,
      classification: armHighway,
      speedLimit: armSpeed.value,
      lanes: !isNaN(armLanesRaw) && armLanesRaw > 0 ? armLanesRaw : armDef.lanes,
      connectionNode,
      distanceAlongWzM: distAlongWzM,
      geometry: armGeom,
      joinSide: sideOfPolyline(joinPolyline, connectionNode, farNode),
    })
  }

  arms.sort((a, b) => a.distanceAlongWzM - b.distanceAlongWzM)
  return arms
}
