import { useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import type { LatLng } from '../types'

type Props = {
  start: LatLng
  end: LatLng
  polyline: LatLng[] | null
  closedSide: 'left' | 'right' | null
  disabled: boolean
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

// Build a closed polygon for one side of the road corridor
function buildSidePolygon(nodes: LatLng[], side: 'left' | 'right', offsetM: number): LatLng[] {
  const sign = side === 'left' ? -90 : 90
  const offsets = nodes.map((node, i) => {
    let bearing: number
    if (nodes.length < 2) return node
    if (i === 0) bearing = getBearing(nodes[0], nodes[1])
    else if (i === nodes.length - 1) bearing = getBearing(nodes[i - 1], nodes[i])
    else bearing = avgBearing(getBearing(nodes[i - 1], nodes[i]), getBearing(nodes[i], nodes[i + 1]))
    return offsetPoint(node, (bearing + sign + 360) % 360, offsetM)
  })
  // Forward along offset side, backward along centreline
  return [...offsets, ...[...nodes].reverse()]
}

export function LaneSideOverlay({ start, end, polyline, closedSide, disabled, onSelectSide }: Props) {
  const map = useMap()
  const cbRef = useRef(onSelectSide)
  cbRef.current = onSelectSide

  useEffect(() => {
    if (!map) return

    const nodes = polyline && polyline.length >= 2 ? polyline : [start, end]
    const OFFSET = 3.5 // metres from centreline — updated when real width is known

    function sideStyle(side: 'left' | 'right') {
      if (closedSide === null) return { fill: '#9ca3af', stroke: '#6b7280', opacity: 0.35 }
      return closedSide === side
        ? { fill: '#ef4444', stroke: '#dc2626', opacity: 0.45 }
        : { fill: '#22c55e', stroke: '#16a34a', opacity: 0.45 }
    }

    const lc = sideStyle('left')
    const rc = sideStyle('right')
    const selectable = closedSide === null && !disabled

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

    return () => {
      leftPoly.setMap(null)
      rightPoly.setMap(null)
      centreline.setMap(null)
    }
  }, [map, start, end, polyline, closedSide, disabled])

  return null
}
