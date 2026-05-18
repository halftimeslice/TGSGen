import { useCallback, useEffect, useState } from 'react'
import {
  Map,
  AdvancedMarker,
  MapMouseEvent,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps'
import { LaneSideOverlay } from './LaneSideOverlay'
import type { WorkZone, WorkZonePoint, LatLng } from '../types'

type Props = {
  workZone: WorkZone
  onWorkZoneChange: (wz: WorkZone) => void
  placingPoint: WorkZonePoint
  selectedPlace: google.maps.places.PlaceResult | null
}

function MapController({ place }: { place: google.maps.places.PlaceResult | null }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !place) return
    if (place.geometry?.viewport) {
      map.fitBounds(place.geometry.viewport)
    } else if (place.geometry?.location) {
      map.panTo(place.geometry.location)
      map.setZoom(17)
    }
  }, [map, place])
  return null
}

const NSW_CENTER: LatLng = { lat: -33.8688, lng: 151.2093 }

const YELLOW = { bg: '#eab308', border: '#a16207', glyph: '#fff' }

export function WorkZoneMap({ workZone, onWorkZoneChange, placingPoint, selectedPlace }: Props) {
  const [hoverPos, setHoverPos] = useState<LatLng | null>(null)

  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      if (!placingPoint || !e.detail.latLng) return
      const pos: LatLng = { lat: e.detail.latLng.lat, lng: e.detail.latLng.lng }
      onWorkZoneChange({ ...workZone, [placingPoint]: pos, closedSide: null, polyline: null })
    },
    [placingPoint, workZone, onWorkZoneChange],
  )

  const handleMouseMove = useCallback(
    (e: MapMouseEvent) => {
      if (!placingPoint || !e.detail.latLng) {
        setHoverPos(null)
        return
      }
      setHoverPos({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng })
    },
    [placingPoint],
  )

  const handleSelectSide = useCallback(
    (side: 'left' | 'right') => {
      onWorkZoneChange({ ...workZone, closedSide: side })
    },
    [workZone, onWorkZoneChange],
  )

  const cursor = placingPoint ? 'crosshair' : 'grab'
  const showOverlay = workZone.start !== null && workZone.end !== null

  return (
    <Map
      mapId="tgsgen-map"
      defaultCenter={NSW_CENTER}
      defaultZoom={13}
      mapTypeId="satellite"
      tilt={0}
      gestureHandling="greedy"
      disableDefaultUI={false}
      style={{ width: '100%', height: '100%', cursor }}
      onClick={handleClick}
      onMousemove={handleMouseMove}
    >
      <MapController place={selectedPlace} />

      {showOverlay && (
        <LaneSideOverlay
          start={workZone.start!}
          end={workZone.end!}
          polyline={workZone.polyline}
          closedSide={workZone.closedSide}
          disabled={placingPoint !== null}
          onSelectSide={handleSelectSide}
        />
      )}

      {workZone.start && (
        <AdvancedMarker position={workZone.start} title="Work zone start">
          <Pin background={YELLOW.bg} borderColor={YELLOW.border} glyphColor={YELLOW.glyph} />
        </AdvancedMarker>
      )}
      {workZone.end && (
        <AdvancedMarker position={workZone.end} title="Work zone end">
          <Pin background={YELLOW.bg} borderColor={YELLOW.border} glyphColor={YELLOW.glyph} />
        </AdvancedMarker>
      )}
      {workZone.third && (
        <AdvancedMarker position={workZone.third} title="Junction point">
          <Pin background={YELLOW.bg} borderColor={YELLOW.border} glyphColor={YELLOW.glyph} />
        </AdvancedMarker>
      )}

      {hoverPos && placingPoint && (
        <AdvancedMarker position={hoverPos}>
          <Pin
            background={YELLOW.bg}
            borderColor={YELLOW.border}
            glyphColor={YELLOW.glyph}
            scale={0.8}
          />
        </AdvancedMarker>
      )}
    </Map>
  )
}
