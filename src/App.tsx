import { useCallback, useEffect, useState } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { WorkZoneMap } from './components/WorkZoneMap'
import { Sidebar } from './components/Sidebar'
import { TGSDiagram } from './components/TGSDiagram'
import type { WorkZone, WorkZonePoint, RoadData, FetchStatus, RingInfo, RoundaboutData, WorkParams, TGSResult, IntersectionArm } from './types'
import { fetchRoadData, fetchRoundaboutArms, fetchIntersectingRoads } from './lib/osmFetch'
import { generateTGS } from './lib/aiGenerate'

export type GenerationState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'error'; message: string }

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

const EMPTY_WORK_ZONE: WorkZone = { start: null, end: null, closedSide: null, polyline: null, polylineSegments: null }

function defaultWorkParams(): WorkParams {
  const today = new Date()
  const start = today.toISOString().split('T')[0]
  const end = new Date(today)
  end.setDate(end.getDate() + 6)
  return {
    workType: 'LANE_CLOSURE',
    affected: 'road',
    isMobile: false,
    startDate: start,
    endDate: end.toISOString().split('T')[0],
    dayStart: '07:00',
    dayEnd: '17:00',
    worksDescription: '',
    tgsNumber: '',
    engineerName: '',
  }
}

export default function App() {
  const [workZone, setWorkZone] = useState<WorkZone>(EMPTY_WORK_ZONE)
  const [placingPoint, setPlacingPoint] = useState<WorkZonePoint>('start')
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null)
  const [roadData, setRoadData] = useState<RoadData | null>(null)
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle')
  const [mainWayIds, setMainWayIds] = useState<string[]>([])
  const [roundaboutWayIds, setRoundaboutWayIds] = useState<string[]>([])
  const [roundaboutData, setRoundaboutData] = useState<RoundaboutData | null>(null)
  const [workParams, setWorkParams] = useState<WorkParams>(defaultWorkParams)
  const [tgsResult, setTgsResult] = useState<TGSResult | null>(null)
  const [generation, setGeneration] = useState<GenerationState>({ status: 'idle' })
  const [intersections, setIntersections] = useState<IntersectionArm[]>([])
  const [mainView, setMainView] = useState<'map' | 'diagram'>('map')
  const [extendedPolyline, setExtendedPolyline] = useState<import('./types').LatLng[] | null>(null)
  const [wzStartOffsetM, setWzStartOffsetM] = useState<number>(0)
  const [ring, setRing] = useState<RingInfo | null>(null)

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
      .then(({ roadData: data, polyline, segments, wayIds, roundaboutWayIds: rabIds, extendedPolyline: ext, wzStartOffsetM: offset, ring: ringInfo }) => {
        setRoadData(data)
        setMainWayIds(wayIds)
        setWorkZone(wz => ({ ...wz, polyline, polylineSegments: segments }))
        setFetchStatus('loaded')
        setRoundaboutWayIds(rabIds)
        setRoundaboutData(null)
        setExtendedPolyline(ext)
        setWzStartOffsetM(offset)
        setRing(ringInfo)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFetchStatus('error')
      })

    return () => controller.abort()
  }, [workZone.start?.lat, workZone.start?.lng, workZone.end?.lat, workZone.end?.lng])

  // Auto-detect intersecting roads within the work zone corridor
  useEffect(() => {
    if (mainWayIds.length === 0 || !workZone.polyline) {
      setIntersections([])
      return
    }
    const controller = new AbortController()
    fetchIntersectingRoads(
      mainWayIds,
      workZone.polyline,
      controller.signal,
      extendedPolyline ?? undefined,
      wzStartOffsetM,
    )
      .then(setIntersections)
      .catch(() => {})
    return () => controller.abort()
  }, [mainWayIds, workZone.polyline])

  // Fetch roundabout arm data once the route is known to pass a roundabout
  useEffect(() => {
    if (roundaboutWayIds.length === 0) {
      setRoundaboutData(null)
      return
    }
    const controller = new AbortController()
    fetchRoundaboutArms(roundaboutWayIds, controller.signal)
      .then(setRoundaboutData)
      .catch(() => {})
    return () => controller.abort()
  }, [roundaboutWayIds])

  async function handleGenerate() {
    if (!roadData || !workZone.polyline || generation.status === 'running') return
    setGeneration({ status: 'running' })
    try {
      const { result } = await generateTGS({
        workParams,
        roadData,
        workZone,
        intersections,
        roundabout: roundaboutData,
        ring,
      })
      setTgsResult(result)
      setGeneration({ status: 'idle' })
      setMainView('map')
    } catch (err) {
      setGeneration({ status: 'error', message: err instanceof Error ? err.message : 'Generation failed' })
    }
  }

  function handleWorkZoneChange(wz: WorkZone) {
    setWorkZone(wz)
    if (placingPoint === 'start' && wz.end === null) {
      setPlacingPoint('end')
    } else {
      setPlacingPoint(null)
    }
  }

  function handleSetPlacingPoint(p: WorkZonePoint) {
    setPlacingPoint(p)
  }

  function handleClear() {
    setWorkZone(EMPTY_WORK_ZONE)
    setPlacingPoint('start')
    setRoadData(null)
    setFetchStatus('idle')
    setMainWayIds([])
    setRoundaboutWayIds([])
    setRoundaboutData(null)
    setIntersections([])
    setExtendedPolyline(null)
    setWzStartOffsetM(0)
    setRing(null)
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
          roundaboutData={roundaboutData}
          onSetPlacingPoint={handleSetPlacingPoint}
          onClear={handleClear}
          onPlaceSelect={handlePlaceSelect}
          workParams={workParams}
          onWorkParamsChange={setWorkParams}
          tgsResult={tgsResult}
          generation={generation}
          onGenerate={handleGenerate}
        />
        <main className="flex-1 relative flex flex-col overflow-hidden">
          {/* View toggle — only visible after generate */}
          {tgsResult && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-1 bg-gray-900 rounded-lg p-1 shadow-lg border border-gray-700">
              <button
                onClick={() => setMainView('map')}
                className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors ${
                  mainView === 'map'
                    ? 'bg-yellow-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Map View
              </button>
              <button
                onClick={() => setMainView('diagram')}
                className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors ${
                  mainView === 'diagram'
                    ? 'bg-yellow-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                TGS Diagram
              </button>
            </div>
          )}

          {/* Map view */}
          <div className={`flex-1 ${mainView === 'map' ? 'block' : 'hidden'}`}>
            <WorkZoneMap
              workZone={workZone}
              onWorkZoneChange={handleWorkZoneChange}
              placingPoint={placingPoint}
              selectedPlace={selectedPlace}
              roadData={roadData}
              ring={ring}
              tgsResult={tgsResult}
              extendedPolyline={extendedPolyline}
              wzStartOffsetM={wzStartOffsetM}
            />
          </div>

          {/* Diagram view */}
          {mainView === 'diagram' && tgsResult && roadData && (
            <div className="flex-1 overflow-hidden">
              <TGSDiagram
                tgsResult={tgsResult}
                workParams={workParams}
                roadData={roadData}
              />
            </div>
          )}
        </main>
      </div>
    </APIProvider>
  )
}
