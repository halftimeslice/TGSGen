import { useEffect } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import type { LatLng, RoundaboutData } from '../types'

// Non-interactive highlight showing a roundabout detected on the selected
// route. Its layout is fetched automatically and handed to the AI — there is
// nothing for the user to click here.

type Props = {
  roundaboutData: RoundaboutData
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
// Used for mini roundabouts which have no ring geometry in OSM.
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

export function RoundaboutOverlay({ roundaboutData }: Props) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    const { center, nodes, type } = roundaboutData

    const ringNodes = type === 'mini' ? syntheticCircle(center) : nodes
    if (ringNodes.length < 3) return

    const outer = ringNodes.map(n => offsetFromCenter(n, center, RING_WIDTH / 2))
    const inner = ringNodes.map(n => offsetFromCenter(n, center, -RING_WIDTH / 2))
    const band = new google.maps.Polygon({
      paths: [...outer, ...[...inner].reverse()],
      fillColor: '#3b82f6', fillOpacity: 0.35,
      strokeColor: '#2563eb', strokeWeight: 2, strokeOpacity: 0.8,
      map, clickable: false, zIndex: 3,
    })

    return () => band.setMap(null)
  }, [map, roundaboutData])

  return null
}
