import { useState } from 'react'
import type { WorkZone, WorkZonePoint, RoadData, FetchStatus, RoundaboutData, WorkParams, WorkType, AffectedPart, TGSResult, IntersectionTreatment } from '../types'
import type { GenerationState } from '../App'
import { SearchBar } from './SearchBar'
import { SignIcon } from './SignIcon'
import { SIGN_PALETTE } from '../lib/signPalette'

// Pressing Enter in a field commits it and closes it, instead of forcing the
// user to click elsewhere to blur.
function blurOnEnter(e: React.KeyboardEvent) {
  if (e.key === 'Enter') (e.target as HTMLElement).blur()
}

type TrafficBucket = 'passive' | 'standard' | 'busy' | 'major'

type TrafficEstimate = {
  display: string
  bucket: TrafficBucket
  bucketLabel: string
}

function tcawTrafficEstimate(classification: string): TrafficEstimate {
  const map: Record<string, TrafficEstimate> = {
    motorway:       { display: '>20,000 vpd', bucket: 'major',    bucketLabel: 'Major — PTCD mandatory' },
    motorway_link:  { display: '>20,000 vpd', bucket: 'major',    bucketLabel: 'Major — PTCD mandatory' },
    trunk:          { display: '~15,000 vpd', bucket: 'busy',     bucketLabel: 'Busy — PTCD preferred' },
    trunk_link:     { display: '~10,000 vpd', bucket: 'busy',     bucketLabel: 'Busy — PTCD preferred' },
    primary:        { display: '~8,000 vpd',  bucket: 'busy',     bucketLabel: 'Busy — PTCD preferred' },
    primary_link:   { display: '~5,000 vpd',  bucket: 'busy',     bucketLabel: 'Busy — PTCD preferred' },
    secondary:      { display: '~3,000 vpd',  bucket: 'busy',     bucketLabel: 'Busy — PTCD preferred' },
    secondary_link: { display: '~2,000 vpd',  bucket: 'busy',     bucketLabel: 'Busy — PTCD preferred' },
    tertiary:       { display: '~1,000 vpd',  bucket: 'standard', bucketLabel: 'Standard — Bat / TTL' },
    tertiary_link:  { display: '~750 vpd',    bucket: 'standard', bucketLabel: 'Standard — Bat / TTL' },
    unclassified:   { display: '~500 vpd',    bucket: 'standard', bucketLabel: 'Standard — Bat / TTL' },
    residential:    { display: '~500 vpd',    bucket: 'standard', bucketLabel: 'Standard — Bat / TTL' },
    service:        { display: '<100 vpd',    bucket: 'passive',  bucketLabel: 'Quiet — Passive control' },
  }
  return map[classification] ?? { display: '~500 vpd', bucket: 'standard', bucketLabel: 'Standard — Bat / TTL' }
}

function computeWorkSummary(p: WorkParams) {
  const startMs = new Date(p.startDate).getTime()
  const endMs   = new Date(p.endDate).getTime()
  const totalDays = Math.max(1, Math.round((endMs - startMs) / 86_400_000) + 1)
  const is24h = p.dayStart === '00:00' && p.dayEnd === '23:59'
  const hasOvernight = totalDays >= 2 && !is24h
  const ttlEligible  = totalDays <= 7
  return { totalDays, hasOvernight, ttlEligible }
}

const TGS_TYPE_LABEL: Record<string, string> = {
  BASIC_DEVICES: 'Basic Devices',
  STOP_SLOW_BAT: 'Stop / Slow Bat',
  TTL_PORTABLE:  'Portable Traffic Lights',
  FULL_CLOSURE:  'Full Closure',
}

const CONTROL_LABEL: Record<string, string> = {
  PASSIVE: 'Passive (no controller)',
  MANUAL:  'Manual — traffic controller',
  PTCD:    'PTCD (automated device)',
}

const TREATMENT_LABEL: Record<IntersectionTreatment['treatment'], string> = {
  CONTROLLER:    'Traffic Controller',
  GIVE_WAY:      'Give Way (passive)',
  ROAD_CLOSURE:  'Road Closure',
}

function TGSResultPanel({
  result,
  worksDescription,
}: {
  result: TGSResult
  worksDescription: string
}) {
  // Deduplicate signs — group by code+description so recovery markers don't merge with taper markers
  const uniqueSigns = result.signs.reduce<Array<{ code: string; description: string; count: number }>>((acc, s) => {
    const existing = acc.find(a => a.code === s.code && a.description === s.description)
    if (existing) existing.count++
    else acc.push({ code: s.code, description: s.description, count: 1 })
    return acc
  }, [])

  return (
    <div className="flex flex-col gap-3">
      {/* Works description */}
      {worksDescription && (
        <div className="rounded bg-gray-800 px-3 py-2">
          <div className="text-xs text-gray-400 mb-1">Works Description</div>
          <p className="text-xs text-white leading-snug">{worksDescription}</p>
        </div>
      )}

      {/* TGS type badge */}
      <div className="rounded bg-yellow-600 px-3 py-2 text-center">
        <div className="text-xs text-yellow-200 uppercase tracking-wider font-semibold">TGS Type</div>
        <div className="text-white font-bold text-sm mt-0.5">{TGS_TYPE_LABEL[result.tgsType]}</div>
      </div>

      {/* warnings */}
      {result.warnings.length > 0 && (
        <div className="rounded bg-red-900 border border-red-600 px-3 py-2 flex flex-col gap-1">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs text-red-300">{w}</p>
          ))}
        </div>
      )}

      {/* Key dimensions */}
      <div className="rounded bg-gray-800 divide-y divide-gray-700 text-xs">
        {[
          ['Control', CONTROL_LABEL[result.controlMethod]],
          ['D (dimension)', `${result.D} m`],
          ['Work zone', `${result.workZoneLength} m`],
          ['Taper each end', `${result.taperLength} m`],
          ['Cone spacing', `${result.coneSpacingM} m`],
          ['Personnel', `${result.personnelRequired}`],
          ['Buffer (1D)', `${result.bufferLength} m`],
          ['Delineators (approx.)', `${result.delineatorCount}`],
          ...(result.speedZone ? [['Speed zone', `${result.speedZone.speedKmh} km/h`]] : []),
          ['Advance warning', `${result.advanceWarning.distanceM} m (${result.advanceWarning.levels} level${result.advanceWarning.levels > 1 ? 's' : ''})`],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-center px-3 py-1.5">
            <span className="text-gray-400">{label}</span>
            <span className="text-white text-right ml-2">{value}</span>
          </div>
        ))}
      </div>

      {/* Phases */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Phases</p>
        <div className="flex flex-col gap-2">
          {result.phases.map((phase, i) => (
            <div key={i} className="rounded bg-gray-800 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${phase.phase === 'DAY' ? 'bg-yellow-600 text-white' : 'bg-blue-900 text-blue-200'}`}>
                  {phase.phase}
                </span>
                <span className="text-gray-300">{TGS_TYPE_LABEL[phase.tgsType]}</span>
              </div>
              {phase.notes.map((n, j) => <p key={j} className="text-gray-500 leading-snug">{n}</p>)}
            </div>
          ))}
        </div>
      </div>

      {/* TTL timing */}
      {result.ttlTiming && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">TTL Cycle</p>
          <div className="rounded bg-gray-800 divide-y divide-gray-700 text-xs">
            {[
              ['Green (work dir)', `${result.ttlTiming.greenWorkS}s`],
              ['All-red', `${result.ttlTiming.allRedS}s`],
              ['Green (through)', `${result.ttlTiming.greenThroughS}s`],
              ['Total cycle', `${result.ttlTiming.cycleS}s`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between px-3 py-1.5">
                <span className="text-gray-400">{label}</span>
                <span className="text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intersecting roads */}
      {result.intersectionTreatments.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Side Roads</p>
          <div className="flex flex-col gap-2">
            {result.intersectionTreatments.map(t => {
              const armLabel = t.arm.name ?? `Unnamed (${t.arm.classification})`
              return (
                <div key={t.arm.wayId} className="rounded bg-gray-800 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white font-semibold truncate mr-2">{armLabel}</span>
                    <span className="text-gray-500 shrink-0">
                      {t.arm.atRoundabout ? 'at roundabout' : `${t.arm.distanceAlongWzM}m along WZ`}
                    </span>
                  </div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    t.treatment === 'ROAD_CLOSURE'
                      ? 'bg-red-700 text-white'
                      : t.treatment === 'CONTROLLER'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-600 text-white'
                  }`}>
                    {TREATMENT_LABEL[t.treatment]}
                  </span>
                  {t.notes.map((n, i) => (
                    <p key={i} className="text-gray-500 leading-snug mt-1">{n}</p>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AI justification */}
      {result.justification && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Why It&apos;s Set Up This Way</p>
          <p className="text-xs text-gray-400 leading-snug bg-gray-800 rounded px-3 py-2">{result.justification}</p>
        </div>
      )}

      {/* Sign list */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Signs Required</p>
        <div className="flex flex-col gap-1.5">
          {uniqueSigns.map(({ code, description, count }) => (
            <div key={code} className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1.5">
              <div className="shrink-0"><SignIcon code={code} px={32} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white">{code}</div>
                <div className="text-xs text-gray-400 truncate">{description}</div>
              </div>
              {count > 1 && <span className="text-xs text-gray-500 shrink-0">×{count}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Compliance notes */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Checks &amp; Compliance</p>
        <ul className="flex flex-col gap-1">
          {result.complianceNotes.map((n, i) => (
            <li key={i} className="text-xs text-gray-500 leading-snug">{n}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const WORK_TYPE_LABEL: Record<WorkType, string> = {
  LANE_CLOSURE:       'Lane closure (alternating traffic)',
  LANE_MERGE:         'Lane merge (multi-lane road)',
  FULL_CLOSURE:       'Full road closure + detour',
  INTERSECTION_WORKS: 'Works at an intersection',
  SHOULDER_VERGE:     'Shoulder / verge works',
  KERBSIDE_PARKING:   'Kerbside / parking lane',
  FOOTPATH_CLOSURE:   'Footpath closure',
  BIKE_SHARED_PATH:   'Bike lane / shared path',
  OTHER:              'Other',
}

const AFFECTED_LABEL: Record<AffectedPart, string> = {
  road:     'Road',
  footpath: 'Footpath',
  both:     'Both',
}

function WorkParamsPanel({ workParams, classification, onChange }: {
  workParams: WorkParams
  classification: string
  onChange: (p: WorkParams) => void
}) {
  const traffic = tcawTrafficEstimate(classification)
  const { totalDays, hasOvernight, ttlEligible } = computeWorkSummary(workParams)

  const inputCls = 'flex-1 min-w-0 bg-gray-800 text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-yellow-400'

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-xs text-gray-400 block mb-1">Work type</label>
        <select
          value={workParams.workType}
          onChange={e => onChange({ ...workParams, workType: e.target.value as WorkType })}
          onKeyDown={blurOnEnter}
          className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-yellow-400"
        >
          {(Object.keys(WORK_TYPE_LABEL) as WorkType[]).map(t => (
            <option key={t} value={t}>{WORK_TYPE_LABEL[t]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">What&apos;s affected</label>
        <div className="flex gap-2">
          {(Object.keys(AFFECTED_LABEL) as AffectedPart[]).map(a => (
            <button
              key={a}
              onClick={() => onChange({ ...workParams, affected: a })}
              className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold transition-colors ${
                workParams.affected === a
                  ? 'bg-yellow-600 text-white ring-2 ring-yellow-400'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {AFFECTED_LABEL[a]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Crew movement</label>
        <div className="flex gap-2">
          {([false, true] as const).map(mobile => (
            <button
              key={String(mobile)}
              onClick={() => onChange({ ...workParams, isMobile: mobile })}
              className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold transition-colors ${
                workParams.isMobile === mobile
                  ? 'bg-yellow-600 text-white ring-2 ring-yellow-400'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {mobile ? 'Mobile works' : 'Stationary'}
            </button>
          ))}
        </div>
        {workParams.isMobile && (
          <p className="text-xs text-gray-500 mt-1">Line marking, mowing, sweeping — the work zone moves along the road.</p>
        )}
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Works period</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={workParams.startDate}
            onChange={e => onChange({ ...workParams, startDate: e.target.value })}
            onKeyDown={blurOnEnter}
            className={inputCls}
          />
          <span className="text-gray-500 text-xs shrink-0">to</span>
          <input
            type="date"
            value={workParams.endDate}
            min={workParams.startDate}
            onChange={e => onChange({ ...workParams, endDate: e.target.value })}
            onKeyDown={blurOnEnter}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Daily hours</label>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={workParams.dayStart}
            onChange={e => onChange({ ...workParams, dayStart: e.target.value })}
            onKeyDown={blurOnEnter}
            className={inputCls}
          />
          <span className="text-gray-500 text-xs shrink-0">to</span>
          <input
            type="time"
            value={workParams.dayEnd}
            onChange={e => onChange({ ...workParams, dayEnd: e.target.value })}
            onKeyDown={blurOnEnter}
            className={inputCls}
          />
        </div>
      </div>

      <div className="rounded bg-gray-800 divide-y divide-gray-700 text-xs">
        <div className="flex justify-between items-center px-3 py-1.5">
          <span className="text-gray-400">Duration</span>
          <span className="text-white flex items-center gap-1.5">
            {totalDays} {totalDays === 1 ? 'day' : 'days'}
            {!ttlEligible && (
              <span className="text-amber-400">(TTL &gt;7 days)</span>
            )}
          </span>
        </div>
        <div className="flex justify-between items-center px-3 py-1.5">
          <span className="text-gray-400">Phases</span>
          <span className="text-white">{hasOvernight ? 'Day + Overnight' : 'Day only'}</span>
        </div>
        <div className="flex justify-between items-start px-3 py-1.5">
          <span className="text-gray-400 shrink-0">Traffic</span>
          <div className="text-right ml-2">
            <div className="text-white">{traffic.display}</div>
            <div className="text-gray-500">{traffic.bucketLabel}</div>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-600 -mt-1">Traffic estimated from TCAW road classification</p>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Works description</label>
        <textarea
          rows={2}
          placeholder="e.g. Water main replacement, kerb and gutter repair..."
          value={workParams.worksDescription}
          onChange={e => onChange({ ...workParams, worksDescription: e.target.value })}
          className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-yellow-400 resize-none placeholder-gray-600"
        />
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">TGS number</label>
        <input
          type="text"
          placeholder="e.g. TGS-2026-014"
          value={workParams.tgsNumber}
          onChange={e => onChange({ ...workParams, tgsNumber: e.target.value })}
          onKeyDown={blurOnEnter}
          className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-yellow-400 placeholder-gray-600"
        />
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Engineer name</label>
        <input
          type="text"
          placeholder="Prepared by"
          value={workParams.engineerName}
          onChange={e => onChange({ ...workParams, engineerName: e.target.value })}
          onKeyDown={blurOnEnter}
          className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-yellow-400 placeholder-gray-600"
        />
      </div>
    </div>
  )
}

type Props = {
  workZone: WorkZone
  placingPoint: WorkZonePoint
  roadData: RoadData | null
  fetchStatus: FetchStatus
  roundaboutData: RoundaboutData | null
  workParams: WorkParams
  tgsResult: TGSResult | null
  generation: GenerationState
  hasEdits: boolean
  onSetPlacingPoint: (p: WorkZonePoint) => void
  onClear: () => void
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void
  onWorkParamsChange: (p: WorkParams) => void
  onGenerate: () => void
  onAddSign: (code: string, description: string) => void
  onResetTgs: () => void
}

function EditTGSPanel({ hasEdits, onAddSign, onResetTgs }: {
  hasEdits: boolean
  onAddSign: (code: string, description: string) => void
  onResetTgs: () => void
}) {
  const [selectedCode, setSelectedCode] = useState(SIGN_PALETTE[0].code)
  const selected = SIGN_PALETTE.find(s => s.code === selectedCode) ?? SIGN_PALETTE[0]

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-400">
        Drag any sign along the road on the map — its distance updates as you move it.
        Click a sign, then the red <span className="text-red-400 font-bold">×</span> to remove it.
      </p>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Add a sign</label>
        <div className="flex items-center gap-2">
          <div className="shrink-0"><SignIcon code={selected.code} px={34} /></div>
          <select
            value={selectedCode}
            onChange={e => setSelectedCode(e.target.value)}
            onKeyDown={blurOnEnter}
            className="flex-1 min-w-0 bg-gray-800 text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-yellow-400"
          >
            {SIGN_PALETTE.map(s => (
              <option key={s.code} value={s.code}>{s.code} — {s.description}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => onAddSign(selected.code, selected.description)}
          className="mt-2 w-full px-3 py-1.5 rounded text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
        >
          Add to work zone start — then drag into place
        </button>
      </div>

      <button
        onClick={onResetTgs}
        disabled={!hasEdits}
        className={`w-full px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
          hasEdits
            ? 'bg-gray-700 hover:bg-gray-600 text-amber-300'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        Reset to AI version
      </button>
    </div>
  )
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

export function Sidebar({ workZone, placingPoint, roadData, fetchStatus, roundaboutData, workParams, tgsResult, generation, hasEdits, onSetPlacingPoint, onClear, onPlaceSelect, onWorkParamsChange, onGenerate, onAddSign, onResetTgs }: Props) {
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
            Roundabouts on the route are detected automatically.
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
                {workZone[point]
                  ? `Move ${point === 'start' ? 'Start' : 'End'} Point`
                  : `Place ${point === 'start' ? 'Start' : 'End'} Point`}
              </button>
            ))}
          </div>

          {(workZone.start || workZone.end) && (
            <button
              onClick={onClear}
              className="mt-3 text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
            >
              Start over
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

        {/* Roundabout detected on the route (auto-detect) */}
        {roundaboutData && (
          <section className="border-t border-gray-700 pt-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Roundabout Detected
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              {roundaboutData.arms.length}-arm roundabout on the selected route. Its full layout
              is passed to the TGS generation automatically.
            </p>
            <div className="rounded bg-gray-800 divide-y divide-gray-700 text-xs">
              {roundaboutData.arms.map((arm, i) => (
                <div key={arm.wayId + i} className="px-3 py-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-medium">
                      {arm.name ?? `Arm ${i + 1}`}
                      {arm.isOneWay && (
                        <span className="ml-1 text-amber-400 font-normal">
                          ({arm.oneWayDir === 'entry' ? '→ in' : '← out'})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-0.5 text-gray-400">
                    <span>{arm.lanes} lane{arm.lanes !== 1 ? 's' : ''}</span>
                    <span>
                      {arm.speedLimit} km/h{arm.speedLimitIsDefault && <span className="ml-1 text-amber-400">(default)</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
              <p className="text-xs text-red-400">
                The free map data service is busy right now — wait a minute, then move a pin slightly to retry.
              </p>
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

        {/* Section 4: Closure Details */}
        {workZoneDefined && (
          <section className="border-t border-gray-700 pt-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              4. Closure Details
            </h2>
            <WorkParamsPanel
              workParams={workParams}
              classification={roadData?.classification ?? 'residential'}
              onChange={onWorkParamsChange}
            />
          </section>
        )}

        {/* Section 5: Generate TGS */}
        {workZoneDefined && (
          <section className="border-t border-gray-700 pt-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              5. Generate TGS
            </h2>
            {fetchStatus === 'loading' && (
              <p className="text-xs text-gray-500 italic mb-2">Fetching road data…</p>
            )}
            {fetchStatus === 'error' && (
              <p className="text-xs text-red-400 mb-2">Road data fetch failed — cannot generate.</p>
            )}
            <button
              onClick={onGenerate}
              disabled={fetchStatus !== 'loaded' || !roadData || generation.status === 'running'}
              className={`w-full px-3 py-2 rounded text-sm font-bold transition-colors ${
                fetchStatus === 'loaded' && roadData && generation.status !== 'running'
                  ? 'bg-yellow-600 hover:bg-yellow-500 text-white cursor-pointer'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {generation.status === 'running' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-500 border-t-white animate-spin shrink-0" />
                  Designing TGS…
                </span>
              ) : (
                'Generate TGS'
              )}
            </button>
            {generation.status === 'running' && (
              <p className="mt-2 text-xs text-gray-500">
                The AI is designing the scheme against the TCAWS rules — this can take a minute or two.
              </p>
            )}
            {generation.status === 'error' && (
              <p className="mt-2 text-xs text-red-400">{generation.message}</p>
            )}
          </section>
        )}

        {/* Edit TGS */}
        {tgsResult && (
          <section className="border-t border-gray-700 pt-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              6. Edit TGS
            </h2>
            <EditTGSPanel hasEdits={hasEdits} onAddSign={onAddSign} onResetTgs={onResetTgs} />
          </section>
        )}

        {/* TGS Result */}
        {tgsResult && (
          <section className="border-t border-gray-700 pt-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              TGS Output
            </h2>
            <TGSResultPanel result={tgsResult} worksDescription={workParams.worksDescription} />
          </section>
        )}

      </div>
    </aside>
  )
}
