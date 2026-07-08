// Mock provider — proves the provider interface is genuinely swappable and
// lets the full browser → server → renderer loop run without an API key.
// Select with: TGS_PROVIDER=mock npm run server
// Numbers are rough placeholders, NOT TCAWS-checked — never use for real work.

export const providerName = 'Mock (no AI — placeholder output)'

export function isConfigured() {
  return true
}

export async function generate({ user }) {
  const jobText = user.find(p => p.type === 'text')?.text ?? '{}'
  const jsonStart = jobText.indexOf('{')
  const job = JSON.parse(jobText.slice(jsonStart))

  const speed = job.roadData?.speedLimit ?? 50
  const wzLen = job.workZone?.lengthM ?? 60
  // Values follow the TCAWS tables so mock output passes the automatic checker
  // (traffic-control/lateral-shift taper column of Table 7-3 — mock always controls flow)
  const taper = speed <= 55 ? 15 : speed <= 65 ? 30 : speed <= 75 ? 70 : speed <= 85 ? 80
    : speed <= 95 ? 90 : speed <= 105 ? 100 : 110
  const coneSpacing = speed <= 45 ? 4 : speed <= 65 ? 8 : speed <= 85 ? 15 : 30
  const D = Math.round(speed / 3.6)
  const buffer = Math.max(30, D) // TCAWS 7.6.2.3
  const advLevels = speed > 85 ? 3 : speed > 65 ? 2 : 1
  const advance = Math.round((speed > 85 ? 2.5 : speed > 65 ? 2 : 1.5) * D) + 20
  const manualAllowed = speed <= 65
  const ttlEligible = !manualAllowed && speed <= 75
  const speedZone = taper > 60 ? { speedKmh: Math.max(40, speed - 40), startDistanceM: -(advance + taper), endDistanceM: wzLen + D } : null

  const mkSign = (code, distanceM, approach, description) => ({
    code, distanceM, approach, roadName: null, description, sizeClass: 'B',
  })

  const output = {
    tgsType: manualAllowed ? 'STOP_SLOW_BAT' : ttlEligible ? 'TTL_PORTABLE' : 'BASIC_DEVICES',
    controlMethod: manualAllowed ? 'MANUAL' : 'PTCD',
    D,
    workZoneLength: wzLen,
    taperLength: taper,
    coneSpacingM: coneSpacing,
    speedZone,
    advanceWarning: { distanceM: advance, levels: advLevels, spacingM: Math.max(D, Math.round(advance / advLevels)) },
    phases: [
      {
        phase: 'DAY',
        tgsType: manualAllowed ? 'STOP_SLOW_BAT' : ttlEligible ? 'TTL_PORTABLE' : 'BASIC_DEVICES',
        controlMethod: manualAllowed ? 'MANUAL' : 'PTCD',
        notes: ['MOCK phase — placeholder only'],
      },
    ],
    signs: [
      mkSign('T1-1', -advance, 'A', 'Roadwork Ahead'),
      mkSign('T5-16', -Math.round(advance / 2), 'A', 'Prepare to Stop'),
      ...(manualAllowed ? [mkSign('T5-2-stop', -5, 'A', 'Stop/Slow bat — controller position')] : []),
      ...(speedZone ? [mkSign('T1-3', -advance, 'A', `Speed Limit ${speedZone.speedKmh}`), mkSign('T1-3', wzLen + D, 'B', 'Speed derestriction')] : []),
      mkSign('T1-1', wzLen + advance, 'B', 'Roadwork Ahead'),
      mkSign('T5-16', wzLen + Math.round(advance / 2), 'B', 'Prepare to Stop'),
      ...(manualAllowed ? [mkSign('T5-2-stop', wzLen + 5, 'B', 'Stop/Slow bat — controller position')] : []),
      mkSign('T1-10', wzLen + taper, 'B', 'End Roadwork'),
    ],
    ttlTiming: ttlEligible ? { greenWorkS: 35, greenThroughS: 45, allRedS: 5, cycleS: 90, mode: 'FIXED_TIME' } : null,
    personnelRequired: 2,
    flashingArrowRequired: speed > 85,
    bufferLength: buffer,
    delineatorCount: Math.round((wzLen + 2 * taper) / coneSpacing),
    sideRoads: (job.intersections ?? []).map(a => ({
      wayId: a.wayId,
      name: a.name,
      treatment: 'CONTROLLER',
      signs: [mkSign('T1-1', -40, 'side-road', 'Roadwork Ahead (side road)')],
      notes: ['MOCK treatment — placeholder only'],
    })),
    complianceNotes: ['MOCK OUTPUT — placeholder numbers, not checked against TCAWS'],
    warnings: ['This is mock output for testing the app without an AI key'],
    justification: 'MOCK: fixed placeholder design to exercise the renderer. Not a real TGS.',
  }

  return { output, usage: { mock: true } }
}
