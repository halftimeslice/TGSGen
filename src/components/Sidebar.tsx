import type { WorkZone, WorkZonePoint, RoadData, FetchStatus } from '../types'
import { SearchBar } from './SearchBar'

type Props = {
  workZone: WorkZone
  placingPoint: WorkZonePoint
  roadData: RoadData | null
  fetchStatus: FetchStatus
  onSetPlacingPoint: (p: WorkZonePoint) => void
  onClear: () => void
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void
}

function DefaultBadge() {
  return (
    <span className="ml-1 text-xs text-amber-400 font-medium">(default)</span>
  )
}

function RoadDataPanel({ data }: { data: RoadData }) {
  const classLabel: Record<string, string> = {
    motorway: 'Motorway', trunk: 'Highway', primary: 'Primary Road',
    secondary: 'Secondary Road', tertiary: 'Tertiary Road',
    unclassified: 'Unclassified', residential: 'Residential', service: 'Service Road',
  }

  const rows: Array<{ label: string; value: string; isDefault?: boolean }> = [
    ...(data.name ? [{ label: 'Road', value: data.name }] : []),
    { label: 'Type', value: classLabel[data.classification] ?? data.classification },
    { label: 'Speed', value: `${data.speedLimit} km/h`, isDefault: data.defaults.speedLimit },
    { label: 'Lanes', value: String(data.lanes), isDefault: data.defaults.lanes },
    { label: 'Width', value: `${data.width} m`, isDefault: data.defaults.width },
    { label: 'Surface', value: data.defaults.surface ? 'Unknown' : data.surface, isDefault: data.defaults.surface },
  ]

  return (
    <div className="mt-2 rounded bg-gray-800 divide-y divide-gray-700 text-xs">
      {rows.map(row => (
        <div key={row.label} className="flex justify-between items-center px-3 py-1.5">
          <span className="text-gray-400">{row.label}</span>
          <span className="text-white">
            {row.value}
            {row.isDefault && <DefaultBadge />}
          </span>
        </div>
      ))}
    </div>
  )
}

export function Sidebar({ workZone, placingPoint, roadData, fetchStatus, onSetPlacingPoint, onClear, onPlaceSelect }: Props) {
  const bothPinsSet = workZone.start !== null && workZone.end !== null
  const workZoneDefined = bothPinsSet && workZone.closedSide !== null

  return (
    <aside className="w-80 bg-gray-900 text-white flex flex-col h-full overflow-y-auto shrink-0">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold tracking-tight">TGSgen</h1>
        <p className="text-xs text-gray-400 mt-0.5">NSW Traffic Guidance Scheme Generator</p>
      </div>

      <SearchBar onPlaceSelect={onPlaceSelect} />

      <div className="p-4 flex flex-col gap-4">

        {/* Section 1: Define Work Zone */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            1. Define Work Zone
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Click a button then click the map to place each end of the work zone.
          </p>

          <div className="flex flex-col gap-2">
            {(['start', 'end'] as const).map((point) => (
              <button
                key={point}
                onClick={() => onSetPlacingPoint(placingPoint === point ? null : point)}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  placingPoint === point
                    ? 'bg-yellow-600 text-white ring-2 ring-yellow-400'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-yellow-400 shrink-0" />
                {workZone[point] ? `Move ${point} point` : `Place ${point} point`}
              </button>
            ))}

            {bothPinsSet && (
              <button
                onClick={() => onSetPlacingPoint(placingPoint === 'third' ? null : 'third')}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  placingPoint === 'third'
                    ? 'bg-yellow-600 text-white ring-2 ring-yellow-400'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-yellow-400 shrink-0" />
                {workZone.third ? 'Move junction point' : 'Add junction point (optional)'}
              </button>
            )}
          </div>

          {(workZone.start || workZone.end) && (
            <button
              onClick={onClear}
              className="mt-3 text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
            >
              Clear work zone
            </button>
          )}
        </section>

        {/* Section 2: Select Work Zone Side */}
        {bothPinsSet && workZone.closedSide === null && (
          <section className="border-t border-gray-700 pt-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              2. Select Work Zone Side
            </h2>
            <p className="text-xs text-gray-400">
              Click the <span className="text-red-400 font-medium">closed side</span> of the road
              on the map. The other side stays{' '}
              <span className="text-green-400 font-medium">open</span> to traffic.
            </p>
          </section>
        )}

        {/* Section 3: Road Data */}
        {bothPinsSet && (
          <section className="border-t border-gray-700 pt-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {workZoneDefined ? '3.' : '—'} Road Data
            </h2>

            {fetchStatus === 'loading' && (
              <p className="text-xs text-gray-500 italic">Fetching road data…</p>
            )}
            {fetchStatus === 'error' && (
              <p className="text-xs text-red-400">Could not fetch road data. Check your connection.</p>
            )}
            {fetchStatus === 'loaded' && roadData && (
              <>
                <RoadDataPanel data={roadData} />
                {Object.values(roadData.defaults).some(Boolean) && (
                  <p className="mt-2 text-xs text-amber-400">
                    Values marked (default) are NSW estimates — verify before generating.
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {/* Section 4: Generate TGS */}
        {workZoneDefined && (
          <section className="border-t border-gray-700 pt-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              4. Generate TGS
            </h2>
            <button
              disabled
              className="w-full px-3 py-2 rounded text-sm font-medium bg-gray-700 text-gray-500 cursor-not-allowed"
            >
              Generate (Phase 3)
            </button>
          </section>
        )}

      </div>
    </aside>
  )
}
