// Automatic TCAWS compliance checker — deterministic validation of the AI's
// TGS against the TCAWS tables (TCAWS_RULESET.md). Every failure message is
// written for the AI: it states the rule, the offending value, and what the
// value must be, so the correction round can fix it precisely.
//
// Provider-independent: runs on whatever the provider returns.

// Sign codes the renderer can draw (SignIcon.tsx) plus their catalogue base
// codes. The AI must not invent codes outside this set.
const KNOWN_SIGN_CODES = new Set([
  'T1-1', 'T1-3', 'T1-4', 'T1-5', 'T1-6', 'T1-9', 'T1-10', 'T1-10-1n',
  'T1-16', 'T1-25', 'T1-34',
  'T2-6', 'T2-207n',
  'T3-1', 'T3-3', 'T3-6', 'T3-9', 'T3-13', 'T3-14', 'T3-37',
  'T5-2', 'T5-2-stop', 'T5-2-slow',
  'T5-4', 'T5-4-left', 'T5-4-right',
  'T5-5', 'T5-5-left', 'T5-5-right',
  'T5-15', 'T5-15-left', 'T5-15-right', 'T5-15-down',
  'T5-16', 'T5-210n', 'T5-272n',
  'T6-4',
  'R2-1', 'R2-17',
])

// TCAWS Table 7-3 — taper length by approach speed and taper type.
// Controlled alternating flow (bat/TTL/PTCD) uses the traffic-control /
// lateral-shift column; uncontrolled merges use the merge column.
function minTaperM(speed, controlled) {
  if (speed <= 45) return 15
  if (speed <= 55) return controlled ? 15 : 30
  if (speed <= 65) return controlled ? 30 : 60
  if (speed <= 75) return controlled ? 70 : 115
  if (speed <= 85) return controlled ? 80 : 130
  if (speed <= 95) return controlled ? 90 : 145
  if (speed <= 105) return controlled ? 100 : 160
  return controlled ? 110 : 180
}

// TCAWS Table 4-10 — roadwork speed zone length limits by zone speed
function speedZoneLengthRange(zoneKmh) {
  if (zoneKmh < 35) return [100, 200]
  if (zoneKmh <= 40) return [150, 500]
  if (zoneKmh <= 60) return [150, Infinity]
  if (zoneKmh <= 70) return [200, Infinity]
  return [500, Infinity]
}

// TCAWS Part 11.4 — cone/marker spacing band by approach speed
function coneSpacingRange(speed) {
  if (speed <= 45) return [3, 5]
  if (speed <= 65) return [6, 10]
  if (speed <= 85) return [10, 22]
  return [25, 60]
}

// TCAWS Part 3.3 — minimum advance warning distance (in units of D)
function minAdvanceD(speed) {
  if (speed <= 65) return 1
  if (speed <= 85) return 2
  return 2.5
}

function workDurationDays(closureDetails) {
  const start = Date.parse(closureDetails?.startDate ?? '')
  const end = Date.parse(closureDetails?.endDate ?? '')
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1)
}

// Returns an array of failure strings; empty = the TGS passes.
export function checkTGS(tgs, job) {
  const failures = []
  const speed = job.roadData?.speedLimit ?? 50
  const D = speed / 3.6

  // ── D formula (TCAWS 5.2.1) ────────────────────────────────────────────
  if (typeof tgs.D !== 'number' || Math.abs(tgs.D - D) > 1.5) {
    failures.push(`D must equal speed ÷ 3.6 = ${speed}/3.6 ≈ ${Math.round(D)} m for this ${speed} km/h road; you gave D=${tgs.D}`)
  }

  // ── Control method by speed (TCAWS 2.1 / 11.1) ─────────────────────────
  const usesManual = tgs.controlMethod === 'MANUAL' ||
    tgs.tgsType === 'STOP_SLOW_BAT' ||
    (tgs.phases ?? []).some(p => p.controlMethod === 'MANUAL' || p.tgsType === 'STOP_SLOW_BAT')
  if (speed > 65 && usesManual) {
    failures.push(`Manual control / stop-slow bat is NOT allowed above 65 km/h (road is ${speed} km/h) — PTCD is required (TCAWS 11.1)`)
  }
  if (speed > 85 && tgs.controlMethod !== 'PTCD' && tgs.tgsType !== 'FULL_CLOSURE') {
    failures.push(`Above 85 km/h PTCD is MANDATORY (road is ${speed} km/h); controlMethod was '${tgs.controlMethod}'`)
  }
  if (speed > 85 && !tgs.flashingArrowRequired) {
    failures.push(`Flashing arrow sign is MANDATORY above 85 km/h (road is ${speed} km/h); set flashingArrowRequired=true and include T5-15`)
  }

  // ── Taper length (TCAWS Table 7-3) ─────────────────────────────────────
  const controlledFlow = tgs.controlMethod !== 'PASSIVE'
  const taperMin = minTaperM(speed, controlledFlow)
  if (typeof tgs.taperLength !== 'number' || tgs.taperLength < taperMin - 0.5) {
    failures.push(`Taper length must be at least ${taperMin} m at ${speed} km/h for ${controlledFlow ? 'controlled alternating flow (traffic control / lateral shift taper)' : 'an uncontrolled merge (merge taper)'} (TCAWS Table 7-3); you gave ${tgs.taperLength} m`)
  }

  // ── Cone spacing (TCAWS 11.4) ──────────────────────────────────────────
  const [coneMin, coneMax] = coneSpacingRange(speed)
  if (typeof tgs.coneSpacingM !== 'number' || tgs.coneSpacingM < coneMin || tgs.coneSpacingM > coneMax) {
    failures.push(`Cone spacing at ${speed} km/h must be between ${coneMin} m and ${coneMax} m (TCAWS 11.4); you gave ${tgs.coneSpacingM} m`)
  }

  // ── Advance warning (TCAWS 3.3) ────────────────────────────────────────
  const advMin = minAdvanceD(speed) * D
  const adv = tgs.advanceWarning ?? {}
  if (typeof adv.distanceM !== 'number' || adv.distanceM < advMin * 0.95) {
    failures.push(`Advance warning distance must be at least ${minAdvanceD(speed)}D = ${Math.round(advMin)} m at ${speed} km/h; you gave ${adv.distanceM} m`)
  }
  if (typeof adv.spacingM !== 'number' || adv.spacingM < D * 0.95) {
    failures.push(`Advance warning sign spacing must be at least 1D = ${Math.round(D)} m; you gave ${adv.spacingM} m`)
  }
  if (speed > 85 && (adv.levels ?? 0) < 3) {
    failures.push(`Above 85 km/h advance warning needs 3 levels (2.5D, 2D, 1D — TCAWS 3.3); you gave ${adv.levels}`)
  } else if (speed > 65 && (adv.levels ?? 0) < 2) {
    failures.push(`Above 65 km/h advance warning needs 2 levels (2D then 1D — TCAWS 3.3); you gave ${adv.levels}`)
  }

  // ── Safety buffer (TCAWS 7.6.2.3: ≥30 m; use larger of 30 m or 1D) ─────
  const bufferMin = Math.max(30, D)
  if (typeof tgs.bufferLength !== 'number' || tgs.bufferLength < bufferMin * 0.95) {
    failures.push(`Safety buffer must be at least ${Math.round(bufferMin)} m (TCAWS 7.6.2.3 requires ≥30 m; Part 3.2 requires ≥1D = ${Math.round(D)} m — use the larger); you gave ${tgs.bufferLength} m`)
  }

  // ── Speed zone (TCAWS 9.1) ─────────────────────────────────────────────
  if ((tgs.taperLength ?? 0) > 60 && !tgs.speedZone) {
    failures.push(`A speed zone is required whenever taper length exceeds 60 m (TCAWS 9.1); taper is ${tgs.taperLength} m but speedZone is null`)
  }
  if (tgs.speedZone) {
    if (tgs.speedZone.speedKmh < 25) {
      failures.push(`Speed zone must be at least 25 km/h (TCAWS 9.1); you gave ${tgs.speedZone.speedKmh} km/h`)
    }
    if (tgs.speedZone.speedKmh >= speed) {
      failures.push(`Speed zone (${tgs.speedZone.speedKmh} km/h) must be below the road speed (${speed} km/h)`)
    }
    const hasSpeedSign = (tgs.signs ?? []).some(s => s.code === 'T1-3')
    if (!hasSpeedSign) {
      failures.push(`Speed zone is active but no T1-3 speed limit sign is placed — required at zone entry and exit (TCAWS 9.2)`)
    }
    const zoneLen = tgs.speedZone.endDistanceM - tgs.speedZone.startDistanceM
    const [zoneMin, zoneMax] = speedZoneLengthRange(tgs.speedZone.speedKmh)
    if (zoneLen < zoneMin) {
      failures.push(`A ${tgs.speedZone.speedKmh} km/h roadwork speed zone must be at least ${zoneMin} m long (TCAWS Table 4-10); yours is ${Math.round(zoneLen)} m (start ${tgs.speedZone.startDistanceM} m to end ${tgs.speedZone.endDistanceM} m)`)
    }
    if (zoneLen > zoneMax) {
      failures.push(`A ${tgs.speedZone.speedKmh} km/h roadwork speed zone must not exceed ${zoneMax} m (TCAWS Table 4-10); yours is ${Math.round(zoneLen)} m`)
    }
  }

  // ── Work zone length must match the measured selection ─────────────────
  const measured = job.workZone?.lengthM
  if (typeof measured === 'number' && typeof tgs.workZoneLength === 'number') {
    const tol = Math.max(5, measured * 0.1)
    if (Math.abs(tgs.workZoneLength - measured) > tol) {
      failures.push(`workZoneLength must match the measured selection of ${measured} m (±${Math.round(tol)} m); you gave ${tgs.workZoneLength} m`)
    }
  }

  // ── TTL rules (TCAWS 5.3–5.5) ──────────────────────────────────────────
  const usesTTL = tgs.tgsType === 'TTL_PORTABLE' ||
    (tgs.phases ?? []).some(p => p.tgsType === 'TTL_PORTABLE')
  if (usesTTL) {
    const days = workDurationDays(job.closureDetails)
    if (days !== null && days > 7) {
      failures.push(`Portable traffic lights are only eligible for works of 1–7 days (TCAWS 5.3); this job runs ${days} days`)
    }
    if (speed > 75) {
      failures.push(`Portable traffic lights allow a maximum road speed of 75 km/h (TCAWS 5.3); road is ${speed} km/h`)
    }
    if (!tgs.ttlTiming) {
      failures.push(`TGS uses portable traffic lights but ttlTiming is null — supply the full cycle timing`)
    }
  }
  if (tgs.ttlTiming) {
    const t = tgs.ttlTiming
    if (t.allRedS < 2) {
      failures.push(`TTL all-red time must be at least 2 s (TCAWS Table B-5); you gave ${t.allRedS} s`)
    }
    if (t.greenWorkS > 45 || t.greenThroughS > 45) {
      failures.push(`TTL green time must not exceed 45 s per direction (TCAWS 5.5); you gave work=${t.greenWorkS} s, through=${t.greenThroughS} s`)
    }
    const expectedCycle = t.greenWorkS + t.greenThroughS + 2 * t.allRedS
    if (Math.abs(t.cycleS - expectedCycle) > 3) {
      failures.push(`TTL cycle must equal greenWork + greenThrough + 2×allRed = ${expectedCycle} s; you gave ${t.cycleS} s`)
    }
    if (t.cycleS < 60 || t.cycleS > 120) {
      failures.push(`TTL cycle must be 60–120 s for work zones (TCAWS 5.5); you gave ${t.cycleS} s`)
    }
  }

  // ── Personnel ──────────────────────────────────────────────────────────
  if (tgs.controlMethod === 'MANUAL' && (tgs.personnelRequired ?? 0) < 1) {
    failures.push(`Manual control requires at least 1 traffic controller (TCAWS 5.1); you gave ${tgs.personnelRequired}`)
  }

  // ── Signs ──────────────────────────────────────────────────────────────
  const signs = tgs.signs ?? []
  const allSigns = [...signs, ...(tgs.sideRoads ?? []).flatMap(sr => sr.signs ?? [])]
  const badCodes = [...new Set(allSigns.map(s => s.code).filter(c => !KNOWN_SIGN_CODES.has(c)))]
  if (badCodes.length > 0) {
    failures.push(`Unknown sign code(s) not in the sign library: ${badCodes.join(', ')} — use only codes from the SIGN LIBRARY CATALOGUE`)
  }
  const hasAdvanceT11 = signs.some(s => s.code === 'T1-1' && s.distanceM < 0 && (s.approach === 'A' || s.approach === 'both'))
  if (!hasAdvanceT11) {
    failures.push(`Every TGS must place a T1-1 ROADWORK AHEAD sign on approach A before the work zone (negative distanceM) — TCAWS 4.1`)
  }
  const hasEndSign = signs.some(s => s.code === 'T1-10')
  if (!hasEndSign) {
    failures.push(`Every TGS must place a T1-10 END ROADWORK sign at the work zone exit — TCAWS 4.1`)
  }
  const usesBat = tgs.tgsType === 'STOP_SLOW_BAT' || (tgs.phases ?? []).some(p => p.tgsType === 'STOP_SLOW_BAT')
  if (usesBat && !allSigns.some(s => s.code.startsWith('T5-2'))) {
    failures.push(`Stop/slow bat operation requires T5-2 stop/slow bat positions in the sign list (TCAWS 5.1)`)
  }

  // ── Side road coverage ─────────────────────────────────────────────────
  const covered = new Set((tgs.sideRoads ?? []).map(sr => sr.wayId))
  const missing = (job.intersections ?? []).filter(a => !covered.has(a.wayId))
  if (missing.length > 0) {
    const names = missing.map(a => `${a.name ?? 'unnamed'} (wayId ${a.wayId})`).join(', ')
    failures.push(`Every intersecting road must receive a sideRoads treatment; missing: ${names}`)
  }

  // ── Roundabout arm coverage ────────────────────────────────────────────
  // Every arm approaching the roundabout, except the entry/exit route arms
  // (handled by the main closure), must get its own sideRoads treatment.
  const rabArms = job.roundabout?.arms ?? []
  const missingArms = rabArms.filter(a => a.routeRole == null && !covered.has(a.wayId))
  if (missingArms.length > 0) {
    const names = missingArms.map(a => `${a.name ?? 'unnamed'} (wayId ${a.wayId})`).join(', ')
    failures.push(`Every roundabout arm that is not on the selected route must receive a sideRoads treatment; missing: ${names}`)
  }

  return failures
}
