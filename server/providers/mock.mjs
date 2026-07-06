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
  const taper = speed <= 60 ? 15 : speed <= 80 ? 30 : 60
  const advance = speed <= 50 ? 60 : speed <= 60 ? 80 : speed <= 80 ? 150 : 250
  const D = Math.round(speed / 3.6)

  const mkSign = (code, distanceM, approach, description) => ({
    code, distanceM, approach, roadName: null, description, sizeClass: 'B',
  })

  const output = {
    tgsType: 'STOP_SLOW_BAT',
    controlMethod: 'MANUAL',
    D,
    workZoneLength: wzLen,
    taperLength: taper,
    coneSpacingM: Math.max(2, Math.round(speed / 10)),
    speedZone: speed > 60 ? { speedKmh: 40, startDistanceM: -advance, endDistanceM: wzLen + advance } : null,
    advanceWarning: { distanceM: advance, levels: 1, spacingM: advance },
    phases: [
      { phase: 'DAY', tgsType: 'STOP_SLOW_BAT', controlMethod: 'MANUAL', notes: ['MOCK phase — placeholder only'] },
    ],
    signs: [
      mkSign('T1-1', -advance, 'A', 'Roadwork Ahead'),
      mkSign('T1-18B', -Math.round(advance / 2), 'A', 'Prepare to Stop'),
      mkSign('T1-1', wzLen + advance, 'B', 'Roadwork Ahead'),
      mkSign('T1-18B', wzLen + Math.round(advance / 2), 'B', 'Prepare to Stop'),
      mkSign('T2-16', wzLen + taper, 'B', 'End Roadwork'),
    ],
    ttlTiming: null,
    personnelRequired: 2,
    flashingArrowRequired: false,
    bufferLength: D,
    delineatorCount: Math.round((wzLen + 2 * taper) / Math.max(2, Math.round(speed / 10))),
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
