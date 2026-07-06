import { useCallback, useEffect, useState } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { WorkZoneMap } from './components/WorkZoneMap'
import { Sidebar } from './components/Sidebar'
import { TGSDiagram } from './components/TGSDiagram'
import type { WorkZone, WorkZonePoint, RoadData, FetchStatus, RoundaboutData, WorkParams, TGSResult, IntersectionArm, IntersectionTreatment } from './types'
import { fetchRoadData, fetchRoundaboutArms, fetchIntersectingRoads } from './lib/osmFetch'
import { runTGSEngine } from './lib/tgsEngine'

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
  const [intersections, setIntersections] = useState<IntersectionArm[]>([])
  const [treatmentOverrides, setTreatmentOverrides] = useState<Record<string, IntersectionTreatment['treatment']>>({})
  const [mainView, setMainView] = useState<'map' | 'diagram'>('map')
  const [extendedPolyline, setExtendedPolyline] = useState<import('./types').LatLng[] | null>(null)
  const [wzStartOffsetM, setWzStartOffsetM] = useState<number>(0)

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
      .then(({ roadData: data, polyline, segments, wayIds, roundaboutWayIds: rabIds, extendedPolyline: ext, wzStartOffsetM: offset }) => {
        setRoadData(data)
        setMainWayIds(wayIds)
        setWorkZone(wz => ({ ...wz, polyline, polylineSegments: segments }))
        setFetchStatus('loaded')
        setRoundaboutWayIds(rabIds)
        setRoundaboutData(null)
        setExtendedPolyline(ext)
        setWzStartOffsetM(offset)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFetchStatus('error')
      })

    return () => controller.abort()
  }, [workZone.start?.lat, workZone.start?.lng, workZone.end?.lat, workZone.end?.lng])

  // Clear treatment overrides whenever the work zone or closed side changes
  useEffect(() => {
    setTreatmentOverrides({})
  }, [workZone.start?.lat, workZone.start?.lng, workZone.end?.lat, workZone.end?.lng, workZone.closedSide])

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

  function handleGenerate() {
    if (!roadData || !workZone.polyline) return
    setTgsResult(runTGSEngine(roadData, workParams, workZone, intersections, treatmentOverrides))
    setMainView('map')
  }

  function handleTreatmentOverride(wayId: string, treatment: IntersectionTreatment['treatment']) {
    if (!roadData || !workZone.polyline) return
    const newOverrides = { ...treatmentOverrides, [wayId]: treatment }
    setTreatmentOverrides(newOverrides)
    setTgsResult(runTGSEngine(roadData, workParams, workZone, intersections, newOverrides))
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
          treatmentOverrides={treatmentOverrides}
          onTreatmentOverride={handleTreatmentOverride}
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
              roundaboutData={roundaboutData}
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
