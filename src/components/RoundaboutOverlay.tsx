import { useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import type { LatLng, RoundaboutData } from '../types'

type Props = {
  roundaboutData: RoundaboutData
  closedSegments: number[]
  onToggleSegment: (idx: number) => void
}

const EARTH_R = 6371000
const RING_WIDTH = 6

function toRad(d: number) { return (d * Math.PI) / 180 }
function toDeg(r: number) { return (r * 180) / Math.PI }

function offsetFromCenter(node: LatLng, center: LatLng, distM: number): LatLng {
  const bearing = Math.atan2(node.lng - center.lng, node.lat - center.lat)
  const d = distM / EARTH_R
  const lat1 = toRad(node.lat)
  const lng1 = toRad(node.lng)
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing))
  const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return { lat: toDeg(lat2), lng: toDeg(lng2) }
}

// Generate a synthetic circle of `numPoints` nodes at `radiusM` metres around a centre.
// Used for mini_roundabout nodes which have no ring geometry in OSM.
const MINI_RAB_RADIUS_M = 8
const MINI_RAB_POINTS   = 32
function syntheticCircle(center: LatLng, radiusM = MINI_RAB_RADIUS_M, numPoints = MINI_RAB_POINTS): LatLng[] {
  const d = radiusM / EARTH_R
  const lat1 = toRad(center.lat)
  const lng1 = toRad(center.lng)
  const pts: LatLng[] = []
  for (let i = 0; i < numPoints; i++) {
    const bearing = (2 * Math.PI * i) / numPoints
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing))
    const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
    pts.push({ lat: toDeg(lat2), lng: toDeg(lng2) })
  }
  return pts
}

// Find the index of the ring node closest to a target point (used to align
// section dividers with actual OSM arm connection nodes).
function closestNodeIdx(nodes: LatLng[], target: LatLng): number {
  let best = 0, bestDist = Infinity
  for (let i = 0; i < nodes.length; i++) {
    const d = Math.hypot(nodes[i].lat - target.lat, nodes[i].lng - target.lng)
    if (d < bestDist) { bestDist = d; best = i }
  }
  return best
}

function extractArc(nodes: LatLng[], startIdx: number, endIdx: number): LatLng[] {
  if (startIdx === endIdx) return nodes.slice()
  const arc: LatLng[] = []
  const n = nodes.length
  let i = startIdx, safety = 0
  while (i !== endIdx && safety++ < n) {
    arc.push(nodes[i])
    i = (i + 1) % n
  }
  arc.push(nodes[endIdx])
  return arc
}

export function RoundaboutOverlay({ roundaboutData, closedSegments, onToggleSegment }: Props) {
  const map = useMap()
  const cbRef = useRef(onToggleSegment)
  cbRef.current = onToggleSegment

  useEffect(() => {
    if (!map) return
    const { center, nodes, arms, type } = roundaboutData

    // Mini roundabouts have no ring geometry — synthesise a circle at a fixed radius
    const effectiveNodes = type === 'mini' ? syntheticCircle(center) : nodes
    if (effectiveNodes.length < 2 || arms.length < 2) return

    const SECTIONS = arms.length
    const cleanups: (() => void)[] = []

    // Divider indices: one per arm, snapped to the closest ring node,
    // then sorted ascending to match the clockwise direction of OSM ring nodes.
    const dividers = arms
      .map(arm => closestNodeIdx(effectiveNodes, arm.connectionNode))
      .sort((a, b) => a - b)

    for (let i = 0; i < SECTIONS; i++) {
      const startIdx = dividers[i]
      const endIdx   = dividers[(i + 1) % SECTIONS]
      const arcNodes = extractArc(effectiveNodes, startIdx, endIdx)
      if (arcNodes.length < 2) continue

      const outer = arcNodes.map(n => offsetFromCenter(n, center, RING_WIDTH / 2))
      const inner = arcNodes.map(n => offsetFromCenter(n, center, -RING_WIDTH / 2))
      const path = [...outer, ...[...inner].reverse()]

      const isClosed = closedSegments.includes(i)
      const fill   = isClosed ? '#ef4444' : '#22c55e'
      const stroke = isClosed ? '#dc2626' : '#16a34a'
      const segIdx = i

      const polygon = new google.maps.Polygon({
        paths: path,
        fillColor: fill, fillOpacity: 0.55,
        strokeColor: stroke, strokeWeight: 2, strokeOpacity: 0.9,
        map, clickable: true, zIndex: 3,
      })

      polygon.addListener('click', () => cbRef.current(segIdx))
      polygon.addListener('mouseover', () => polygon.setOptions({ fillOpacity: 0.75 }))
      polygon.addListener('mouseout',  () => polygon.setOptions({ fillOpacity: 0.55 }))
      cleanups.push(() => polygon.setMap(null))
    }

    return () => cleanups.forEach(fn => fn())
  }, [map, roundaboutData, closedSegments])

  return null
}
