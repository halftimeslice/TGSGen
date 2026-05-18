import { useCallback, useEffect, useState } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { WorkZoneMap } from './components/WorkZoneMap'
import { Sidebar } from './components/Sidebar'
import type { WorkZone, WorkZonePoint, RoadData, FetchStatus } from './types'
import { fetchRoadData } from './lib/osmFetch'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

const EMPTY_WORK_ZONE: WorkZone = { start: null, end: null, third: null, closedSide: null, polyline: null }

export default function App() {
  const [workZone, setWorkZone] = useState<WorkZone>(EMPTY_WORK_ZONE)
  const [placingPoint, setPlacingPoint] = useState<WorkZonePoint>(null)
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null)
  const [roadData, setRoadData] = useState<RoadData | null>(null)
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle')

  // Fetch road data whenever both pins are placed or moved
  useEffect(() => {
    if (!workZone.start || !workZone.end) {
      setRoadData(null)
      setFetchStatus('idle')
      return
    }

    setRoadData(null)
    setFetchStatus('loading')

    const controller = new AbortController()

    fetchRoadData(workZone.start, workZone.end, controller.signal)
      .then(({ roadData: data, polyline }) => {
        setRoadData(data)
        setWorkZone(wz => ({ ...wz, polyline }))
        setFetchStatus('loaded')
      })
      .catch(() => {
        if (!controller.signal.aborted) setFetchStatus('error')
      })

    return () => controller.abort()
  }, [workZone.start?.lat, workZone.start?.lng, workZone.end?.lat, workZone.end?.lng])

  function handleWorkZoneChange(wz: WorkZone) {
    setWorkZone(wz)
    setPlacingPoint(null)
  }

  function handleSetPlacingPoint(p: WorkZonePoint) {
    setPlacingPoint(p)
  }

  function handleClear() {
    setWorkZone(EMPTY_WORK_ZONE)
    setPlacingPoint(null)
    setRoadData(null)
    setFetchStatus('idle')
  }

  const handlePlaceSelect = useCallback((place: google.maps.places.PlaceResult) => {
    setSelectedPlace(place)
  }, [])

  return (
    <APIProvider apiKey={API_KEY}>
      <div className="flex h-full w-full">
        <Sidebar
          workZone={workZone}
          placingPoint={placingPoint}
          roadData={roadData}
          fetchStatus={fetchStatus}
          onSetPlacingPoint={handleSetPlacingPoint}
          onClear={handleClear}
          onPlaceSelect={handlePlaceSelect}
        />
        <main className="flex-1 relative">
          <WorkZoneMap
            workZone={workZone}
            onWorkZoneChange={handleWorkZoneChange}
            placingPoint={placingPoint}
            selectedPlace={selectedPlace}
          />
        </main>
      </div>
    </APIProvider>
  )
}
