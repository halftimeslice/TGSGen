export type LatLng = {
  lat: number
  lng: number
}

export type WorkZonePoint = 'start' | 'end' | 'third' | null

export type WorkZone = {
  start: LatLng | null
  end: LatLng | null
  third: LatLng | null
  closedSide: 'left' | 'right' | null
  polyline: LatLng[] | null
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
