export type LatLng = {
  lat: number
  lng: number
}

export type WorkZonePoint = 'start' | 'end' | null

export type PolylineSegment = {
  type: 'road' | 'roundabout'
  nodes: LatLng[]
}

// Full roundabout ring the route passes through, for drawing the selection
// corridors around the central island
export type RingInfo = {
  nodes: LatLng[]      // ordered loop in travel (clockwise) direction, no duplicate closing node
  center: LatLng
  entryIdx: number     // ring node where the route enters
  exitIdx: number      // ring node where the route exits
  entryWayId: string   // OSM way the route arrives on
  exitWayId: string    // OSM way the route leaves on
}

export type WorkZone = {
  start: LatLng | null
  end: LatLng | null
  closedSide: 'left' | 'right' | null
  polyline: LatLng[] | null
  polylineSegments: PolylineSegment[] | null
}

export type RoadData = {
  osmWayId: string | null
  name: string | null
  classification: string
  speedLimit: number
  lanes: number
  width: number
  surface: string
  defaults: {
    speedLimit: boolean
    lanes: boolean
    width: boolean
    surface: boolean
  }
}

export type FetchStatus = 'idle' | 'loading' | 'loaded' | 'error'

export type RoundaboutArm = {
  wayId: string
  pairedWayId?: string          // set when two one-way ways (entry + exit) are grouped as one arm
  name: string | null
  lanes: number
  speedLimit: number
  speedLimitIsDefault: boolean
  isOneWay: boolean
  oneWayDir: 'entry' | 'exit' | null
  connectionNode: LatLng
  angleFromCenter: number
}

export type RoundaboutData = {
  type: 'full' | 'mini'
  wayId: string          // OSM way ID for full RAB; OSM node ID for mini RAB
  center: LatLng
  nodes: LatLng[]        // ring geometry — empty for mini RAB (ring is synthesised)
  arms: RoundaboutArm[]
}

export type WorkType =
  | 'LANE_CLOSURE'        // lane closure, alternating traffic
  | 'LANE_MERGE'          // lane merge on multi-lane road (taper only)
  | 'FULL_CLOSURE'        // full road closure with detour
  | 'INTERSECTION_WORKS'  // works at an intersection
  | 'SHOULDER_VERGE'      // shoulder / verge works, no lane closed
  | 'KERBSIDE_PARKING'    // kerbside / parking lane closure
  | 'FOOTPATH_CLOSURE'    // footpath closure + pedestrian diversion
  | 'BIKE_SHARED_PATH'    // bike lane / shared path works
  | 'OTHER'

export type AffectedPart = 'road' | 'footpath' | 'both'

export type WorkParams = {
  workType: WorkType
  affected: AffectedPart
  isMobile: boolean       // mobile works (line marking, mowing, sweeping) vs stationary
  startDate: string       // "YYYY-MM-DD"
  endDate: string         // "YYYY-MM-DD"
  dayStart: string        // "HH:MM" 24h
  dayEnd: string          // "HH:MM" 24h
  worksDescription: string
  tgsNumber: string
  engineerName: string
}

export type TGSType = 'BASIC_DEVICES' | 'STOP_SLOW_BAT' | 'TTL_PORTABLE' | 'FULL_CLOSURE'
export type ControlMethod = 'PASSIVE' | 'MANUAL' | 'PTCD'
export type SignSizeClass = 'A' | 'B' | 'C' | 'D'

export type PlacedSign = {
  code: string
  distanceM: number        // metres from WZ start; negative = before WZ
  approach: 'A' | 'B' | 'both' | 'side-road'
  roadName?: string        // set for side-road signs — the name of the intersecting road
  description: string
  sizeClass: SignSizeClass
}

export type TGSPhaseDetail = {
  phase: 'DAY' | 'OVERNIGHT'
  tgsType: TGSType
  controlMethod: ControlMethod
  notes: string[]
}

export type IntersectionArm = {
  wayId: string
  name: string | null
  classification: string
  speedLimit: number
  lanes: number
  connectionNode: LatLng
  distanceAlongWzM: number   // metres from work zone start
  geometry: LatLng[]
  joinSide: 'left' | 'right' // which side of the main road polyline this arm joins from
}

export type IntersectionTreatment = {
  arm: IntersectionArm
  treatment: 'CONTROLLER' | 'GIVE_WAY' | 'ROAD_CLOSURE'
  autoTreatment: 'CONTROLLER' | 'GIVE_WAY' | 'ROAD_CLOSURE' // engine default before any user override
  signsOnSideRoad: PlacedSign[]
  additionalPersonnel: number
  notes: string[]
}

export type TGSResult = {
  tgsType: TGSType
  controlMethod: ControlMethod
  D: number
  workZoneLength: number
  taperLength: number
  coneSpacingM: number
  speedZone: {
    enabled: boolean
    speedKmh: number
    startDistanceM: number
    endDistanceM: number
  } | null
  advanceWarning: {
    distanceM: number
    levels: number
    spacingM: number
  }
  phases: TGSPhaseDetail[]
  signs: PlacedSign[]
  ttlTiming: {
    greenWorkS: number
    greenThroughS: number
    allRedS: number
    cycleS: number
    mode: 'MANUAL_SHUTTLE' | 'FIXED_TIME' | 'VEHICLE_ACTUATED'
  } | null
  personnelRequired: number
  flashingArrowRequired: boolean
  bufferLength: number
  delineatorCount: number
  complianceNotes: string[]
  warnings: string[]
  intersectionTreatments: IntersectionTreatment[]
  justification?: string   // AI's plain-language explanation of the design
}
