# TGSgen Decision Engine Ruleset
## Extracted from TCAW (Transport for NSW Traffic Control at Work Sites) v6.1
**Source:** TS 05492 Parts 1-4 | Effective: 28 February 2022 + Amendments TD 00003:2022, TD 00031:2022

---

## Part 1: Decision Framework

### 1.1 Work Type Classification

| Work Type | Definition | Characteristics | Control Implications |
|-----------|-----------|-----------------|----------------------|
| **Static** | Work zone remains in same location | Duration: hours to weeks | Standard TGS; fixed sign placement |
| **Dynamic-Frequent** | Work moves frequently (hourly) | e.g., line marking crews | Shadow vehicle required (or <1500 vpd exception); signs relocated continuously |
| **Dynamic-Continuous** | Work moves progressively (km) | e.g., resurfacing | Convoy setup; advance warning vehicle (VMS); 2km advance warning |
| **Dynamic-Intermittent** | Work stops/starts unpredictably | e.g., pothole repairs | GIVE WAY + ONE LANE; <100 vpd only; ≥300m sight distance required |

### 1.2 Core Decision Inputs (Mandatory for Engine)

```
Input: SPEED [km/h]
  - From road data (OSM or override)
  - Thresholds: 30, 45, 65, 85, 95, 110
  
Input: LANES [count]
  - From road data (OSM or override)
  - Cases: 1, 2, 3, 4+
  
Input: TRAFFIC_VOLUME [vpd = vehicles per day]
  - Thresholds: 100, 1500, 20000
  
Input: WORK_DURATION [hours/days]
  - TTL eligibility: 1-7 days only
  
Input: SIGHT_DISTANCE [metres]
  - TTL minimum: 150m
  - Single-lane minimum: 300m
  - Night delineation: 250m
  
Input: WORK_TYPE ['static', 'dynamic-frequent', 'dynamic-continuous', 'dynamic-intermittent']

Input: TIME_OF_DAY ['day', 'night']
  - Night work = flashing arrows mandatory on high-speed roads
  
Input: VISIBILITY ['clear', 'reduced', 'poor']
  - For night work & rain adjustments
```

---

## Part 2: TGS Type Selection Logic

### 2.1 Decision Tree: Control Method by Speed

```
IF speed <= 45 km/h:
  → Manual control allowed (SFAIRP documented)
  → PTCD preferred but not required
  → Taper: 15m traffic control length
  
IF 45 < speed <= 65 km/h:
  → PTCD preferred
  → Manual allowed with traffic controller
  → Taper: 30m traffic control length
  → Sign advance: 1D spacing (1 × dimension D)
  
IF 65 < speed <= 85 km/h:
  → PTCD required
  → Manual NOT allowed
  → Taper: 60m to 130m (varies by scenario)
  → Sign advance: 2D spacing (2 × dimension D)
  
IF speed > 85 km/h:
  → PTCD MANDATORY
  → Manual NEVER allowed
  → Flashing arrow sign MANDATORY on merge
  → 20,000+ vpd: PTCD with SCATS/SCOOT integration
  → Sign advance: 2.5D spacing
```

### 2.2 Fundamental Dimension: D Formula

**All distances are calculated from D** (section 5.2.1):
```
D = speed_km/h ÷ 3.6

Examples:
  50 km/h → D = 13.9m ≈ 14m
  60 km/h → D = 16.7m ≈ 17m
  80 km/h → D = 22.2m ≈ 22m
  100 km/h → D = 27.8m ≈ 28m
  110 km/h → D = 30.6m ≈ 31m
```

All "1D advance", "1.5D taper", "2D warning distance" references use this formula.

### 2.3 TGS Type Output

```
TGS_TYPE = one of:
  - "BASIC_DEVICES"        → Hazard markers + cones + manual control (low-speed)
  - "STOP_SLOW_BAT"        → Stop/Slow bat + traffic controller (daytime, <85km/h)
  - "TTL_PORTABLE"         → Portable traffic lights (two-way shuttle)
  - "FULL_CLOSURE"         → Work zone fully closed; detour required
```

---

## Part 3: Taper & Buffer Distance Rules

### 3.1 Taper Length by Scenario

| Speed | Single Lane | Merge (Dual) | Traffic Control | Notes |
|-------|------------|--------------|-----------------|-------|
| ≤45 km/h | 15m | — | 15m | —|
| 45-65 km/h | 30m | — | 30m | 1.5D for dual carriageway merge |
| 65-85 km/h | 60m | 60m (1.5D) | 80m | Multi-lane: 1.5D minimum |
| >85 km/h | 130m (1.5D) | 115m+ (1.5D) | 130m+ | Speed zone applies; taper = speed zone length |

**Source:** Appendix D (Table D-1, D-2); Section 5.5

### 3.2 Buffer Distances

| Scenario | Buffer | Notes |
|----------|--------|-------|
| Between taper end & work zone start | 0m | Immediately adjacent |
| Between cones (taper lining) | 4m @ ≤45 km/h | Section 6.2.2 |
| | 8m @ 45-65 km/h | |
| | 15-20m @ 65-85 km/h | |
| | 30-60m @ >85 km/h | Flashing arrows preferred; maintain sight |
| Behind work zone (end buffer) | ≥ 1D | Recovery distance for traffic |

### 3.3 Advance Warning Distances

**Sign placement ahead of work zone:**

| Speed | Advance Distance | Sign Spacing | Notes |
|-------|------------------|--------------|-------|
| ≤45 km/h | 1D | 1D between signs | Manual control visibility |
| 45-65 km/h | 1D | 1D | PTCD or manual |
| >65 km/h | 2D | 2D first level; 1D second level | PTCD required |
| >85 km/h | 2.5D | 2.5D first; 2D second; 1D third | Multi-line required; flashing arrow at taper |

**Source:** Section 5.3, 5.4; Appendix B (B-2)

---

## Part 4: Sign Placement & Codes

### 4.1 Mandatory Sign Sequence (Installation Order)

**ALL work zones must follow this sequence (Section 6.4):**

1. **Advance Warning (2.5D-2D ahead):** T1-1 ROADWORK AHEAD + speed signs
2. **Primary Taper Line Start:** Hazard markers (T5-4, T5-5) + cones
3. **Merge/Diversion Point:** Arrow boards (flashing if >85km/h) or GIVE WAY
4. **Work Zone Start:** "WORK ZONE" sign (T1-9)
5. **Work Zone End:** "END ROADWORK" sign (T1-10)
6. **Recovery Distance:** Delineation continues 1D beyond

**Removal order (Section 6.4.3):** Reverse sequence

### 4.2 Sign Codes by Scenario

**Advance Warning Level 1 (2.5D ahead on >85km/h roads):**
- T1-1: ROADWORK AHEAD
- T1-3: SPEED LIMIT (reduced zone speed if applicable)
- Optional: T1-10-1: TRAFFIC HAZARD AHEAD (dynamic work)

**Advance Warning Level 2 (at 1.5D, for 65-85km/h):**
- T1-1: ROADWORK AHEAD (reiterate)
- T1-3: SPEED LIMIT XXX KM/H (mandatory on speed zone entry)

**At Taper (Work Zone Entry):**
- T5-4/T5-5: HAZARD MARKERS (white/red striped bollards, 4m-30m spacing)
- Cones: Yellow/white cones lining taper (4-60m spacing depending on speed)
- T5-15: FLASHING ARROW SIGN (mandatory >85km/h, nighttime, or reduced visibility)
- T1-9: WORK ZONE (at taper start)

**At Work Zone Exit:**
- T1-10: END ROADWORK
- Speed derestriction sign (if speed zone active)

**Special Cases:**
- Stop/Slow Bat: T5-2 STOP/SLOW sign on both ends (white/red)
- TTL: Traffic signal installation replaces some signs
- Single Lane: GIVE WAY sign + ONE LANE sign (one each direction)

**Source:** Section 7.0; Appendix C (Sign Code Table)

### 4.3 Multi-Lane Rules

**For roads with 3+ lanes:**
- Close ONE lane at a time (Section 5.1)
- Space consecutive lane closures at 1.5D apart
- Each closure requires full sign sequence
- Flashing arrows mandatory on all lanes if >85km/h

**Example: 4-lane road, 1 lane closed:**
```
→ Lane 1 closed (taper at 2D advance)
  (1.5D gap)
→ Lane 2 open
  (1.5D gap)
→ Lane 3 open
  (1.5D gap)
→ Lane 4 open
```

---

## Part 5: Traffic Control Devices & Personnel

### 5.1 Manual Stop/Slow Bat

**Eligibility (Section 5.7):**
- Speed: ≤45 km/h ONLY (or 45-65km/h with SFAIRP and approval)
- Work type: Static only
- Traffic controller: 1 person minimum (2 recommended for both directions)
- Sight distance: ≥1D ahead

**Equipment:**
- STOP/SLOW bat (manual flag): T5-2 sign
- 2 required (one per direction on 2-way roads)
- Hi-vis clothing (AS/NZS 4602)

**Not allowed at:**
- Speed >65 km/h without PTCD backup
- Night without floodlighting
- Vision <250m (night delineation minimum)

### 5.2 Portable Traffic Control Device (PTCD)

**PTCD = Portable Traffic Signal (TTL) or automated stop/slow system**

**When required:**
- Speed >65 km/h: PTCD required
- Speed >85 km/h: PTCD MANDATORY
- >20,000 vpd: PTCD with SCATS/SCOOT (integrated signals)
- Multi-lane high-speed: Always PTCD

**Not required at:**
- Speed ≤45 km/h (manual allowed)
- 45-65km/h if manual with traffic controller is SFAIRP approved
- Single-lane low-traffic (100 vpd or less)

### 5.3 Portable Traffic Lights (TTL)

**Operational Requirements (Appendix B):**
- Minimum sight distance: 150m to stop-line
- Work speed: <65 km/h preferred; ≤75km/h maximum
- Duration: 1-7 days only (longer = permanent signals or SCATS)
- Two-way shuttle only: One work phase + one traffic phase

**Installation Sequence (Section 6.4):**
1. Place advance warning signs (2D ahead)
2. Set up stop-lines: work traffic stop-line + opposing traffic stop-line
3. Install signal heads at each stop-line
4. Activate with 150m visible distance confirmed

**Traffic Light Operating Modes:**
- **Manual shuttle:** Operator flips direction every cycle (no sensors)
- **Vehicle-actuated:** Induction loops detect vehicles; adjust timing automatically
- **Fixed-time:** Preset timing; cycle repeats every N seconds

### 5.4 All-Red (Intergreen) Timing Rules

**All-red time = clearance time for work zone**

**Table B-5 & B-6 (Source: Section 5.6.3):**

| Stop-Line Distance to Work Start | All-Red Duration |
|----------------------------------|------------------|
| 0-30m | 2 seconds |
| 30-45m | 5 seconds |
| 45-75m | 10 seconds |
| >75m | 15+ seconds (1 sec per 5m additional) |

**Formula for custom distances:**
```
All-Red = 2s + (distance_m - 30) / 5
  (round UP to nearest 1s)
```

**Critical:** If work zone extends beyond 75m, use dynamic intergreen or add beacon-controlled extension.

### 5.5 Green Time Rules

**Maximum green time per direction (Section 5.6.2):**

| Clearance Speed | Max Green | Notes |
|-----------------|-----------|-------|
| <25 km/h | 30s | Work zone; low-speed |
| 25-45 km/h | 35s | High-demand direction allowed |
| >45 km/h | 35s maximum | Safety constraint; cycle must include both directions |

**Cycle calculation:**
```
Total_Cycle = Green_A + AllRed_AB + Green_B + AllRed_BA
  (minimum 90s; maximum 120s for work zones)
```

**Overnight TTL (multi-phase scenario):**
- Day phase: 45s green (work); 10s all-red; 45s green (through traffic)
- Night phase: 35s green (per direction); 5-10s all-red; TTL on auto-cycle

### 5.6 Shadow Vehicle (Dynamic Work)

**Required for frequently-moving work** (Section 5.1.3):

| Work Type | Shadow Vehicle | Exception |
|-----------|-----------------|-----------|
| Dynamic-Frequent (hourly moves) | YES | If <1500 vpd + 1.5D sight + ≤2 work pieces + <85km/h + 1.5m clearance |
| Dynamic-Continuous (progressive) | Work convoy + advance VMS | If low-volume exception met |
| Dynamic-Intermittent (unpredictable) | GIVE WAY sign only | Single-lane passive control; <100 vpd; ≥300m sight |

**Shadow Vehicle Specification:**
- Minimum 2 persons: driver + lookout
- Hi-vis marking (AS/NZS 4602)
- Flashing beacon mandatory if road speed >60km/h
- Must maintain line-of-sight with work crew

---

## Part 6: Road Geometry & Lane Rules

### 6.1 Single Carriageway (2-way traffic, undivided)

**1 lane closed → alternating traffic:**

| Scenario | Control | Requirement |
|----------|---------|-------------|
| Length <100m, <100 vpd | GIVE WAY + ONE LANE | Passive; no personnel |
| Length <100m, 100-1500 vpd | Stop/Slow bat OR TTL | Traffic controller |
| Length >100m, any volume | Stop/Slow bat OR PTCD | Based on speed & volume |
| Speed >85km/h | PTCD required | Flashing arrow mandatory |

**Lane side selection (Critical UX):**
- After snapping to centreline, user selects LEFT or RIGHT closed
- Sets reference for: taper direction, sign placement, operator positions
- Both directions affected (one side sees taper; other side sees through traffic)

### 6.2 Dual Carriageway (separated directions)

**1 lane closed on one side → merge (no alternating):**

| Scenario | Control | Requirement |
|----------|---------|-------------|
| Merge taper <60m | Basic devices | Cones + hazard markers |
| Merge taper 60-130m | PTCD if >65km/h | Flashing arrow at merge point |
| Median work (both sides) | Separate TGS per direction | Both require independent sign sequences |
| Closure >1 lane | Temporary lane reduction | May require full closure if <2 lanes remain |

**Taper spacing (Section 5.5):**
- Minimum 1.5D between start of taper and start of work
- If 2+ lanes closed: Space closures 1.5D apart

### 6.3 Motorway (>85km/h mandatory PTCD)

**Motorway-specific rules (Section 5.9):**
- No manual stop/slow bat allowed
- PTCD mandatory; prefer integrated SCATS/SCOOT
- Flashing arrow sign mandatory at every merge or lane closure
- Minimum 2 traffic controllers on-site if manual work area
- Backup power required for TTL (4-hour battery minimum)
- Night work: Floodlighting required; beacon-equipped shadow vehicle

---

## Part 7: Night Work & Visibility

### 7.1 Night Work Modifications

**When sun down OR visibility <250m (fog/rain):**

| Control Type | Day Rules | Night Additions |
|---|---|---|
| Manual STOP/SLOW | 1 controller | +Floodlighting (2×1000W minimum); second controller recommended; reflective bats |
| PTCD / TTL | Advance signs | +Flashing beacon on all signal heads; advance lighting |
| Cones/markers | 4-60m spacing | Reduce spacing to 4-8m (closer proximity); add retroreflective tape |
| Advance signs | 2D ahead | 2.5D ahead + flashing arrow recommendation |

**Required at night:**
- Flashing arrow signs on high-speed roads (>65km/h)
- Retroreflective sheeting on all signs (minimum Class 2; Class 3 preferred)
- Floodlighting with backup units for personnel visibility
- All personnel hi-vis Class 3 (fluorescent yellow-green)

### 7.2 Weather Impact

**Visibility <150m (heavy rain, fog):**
- Reduce speed limit: recommend speed = 2D only (e.g., 80km/h → 40km/h)
- Taper length increases: use 1.5D instead of 1D
- TTL: All-red time +2-3 seconds for reduced traction
- Advance signs: Move to 3D ahead (add intermediate warning)

---

## Part 8: TTL Overnight Cycling (Multi-Phase Scenario)

### 8.1 Overnight TTL Setup (Critical for Day+Night TGS)

**Scenario:** 3-day works. Day = stop-slow bat; Night = TTL on timer.

**Cycle Design (from notes):**

```
Overnight Phase (no traffic controllers present):

Stop-line positions:
  → Work traffic stop-line: 30-45m before work zone
  → Opposite traffic stop-line: 45-75m beyond work zone

Green Time Allocation:
  → Work direction: 35s (operators can safely egress if running late)
  → Through traffic: 45s (more comfortable for public)
  → All-red (work → through): 5s (distance = ~35m)
  → All-red (through → work): 5s (distance = ~50m)
  → Total cycle: 35 + 5 + 45 + 5 = 90 seconds

Beacon pattern:
  → Flash during red (to reinforce stop)
  → Steady during green
  → No pedestrian push-buttons (work zone; no crossing allowed)

Activation:
  → 5pm: Manual switch to night mode (or timer-controlled)
  → 6am: Manual switch back to day mode (stop-slow bat resumes)
  → Controllers collect bats; revert signage
```

**Critical safeguard:**
- Provide manual override (key-operated) to stop all traffic if emergency
- Daily inspection of signal operation before handover to night mode
- Written log of mode changes, timing adjustments, malfunction events

---

## Part 9: Speed Zone Rules

### 9.1 Speed Limit Reduction Requirements

**When to impose speed zone (Section 4.1):**
- Always if taper length >60m
- If high-speed entry (>65km/h) into low-speed work (taper alignment)
- If visibility restricted to <2D

**Speed zone extent:**
- From: 2D ahead of advance warning sign
- To: 1D beyond end-of-work sign (recovery distance)

**Speed zone value:**
- Minimum 25 km/h in work zone
- Reduced-speed zone in taper: 1.5 × approach speed (e.g., 80km/h road → 50km/h in taper)
- Return to normal speed after 1D recovery distance

**Example:**
```
Road = 80 km/h (D ≈ 22m)
  → 2D advance (44m): "ROADWORK AHEAD" + "SPEED LIMIT 50"
  → Taper (1.5D = 33m): 50 km/h zone enforced
  → Work zone: 25 km/h minimum
  → 1D recovery (22m): Return to 80 km/h
```

### 9.2 Sign Placement for Speed Zones

- Speed limit sign (T1-3) MUST be at zone entry and exit
- Intermediate 1D spacing on roads >65km/h
- Day+Night: Add flashing beacon to entry sign at night (visibility enhancement)

---

## Part 10: Decision Engine Outputs

### 10.1 Output Structure (per TGS)

```javascript
{
  tgs_type: "STOP_SLOW_BAT" | "TTL_PORTABLE" | "BASIC_DEVICES" | "FULL_CLOSURE",
  control_method: "MANUAL" | "PTCD" | "TTL" | "PASSIVE",
  speed_zone: {
    enabled: true,
    speed_kmh: 50,
    start_distance_m: 44,  // 2D ahead
    end_distance_m: 22     // 1D beyond work end
  },
  taper: {
    length_m: 33,
    side: "LEFT" | "RIGHT",  // Lane side selection
    cone_spacing_m: 8,
    start_hazard_marker: "T5-4",
    flashing_arrow: false    // true if >85km/h
  },
  advance_warning: {
    distance_m: 44,          // 2D ahead
    sign_codes: ["T1-1", "T1-3"],
    spacing_m: 22            // 1D between signs
  },
  signs: [
    { code: "T1-1", position: -44, description: "ROADWORK AHEAD" },
    { code: "T1-3", position: -44, description: "SPEED LIMIT 50" },
    { code: "T5-4", position: 0, description: "HAZARD MARKER START" },
    { code: "T1-9", position: 0, description: "WORK ZONE" },
    { code: "T1-10", position: 100, description: "END ROADWORK" }
  ],
  traffic_control: {
    personnel_required: 1,
    night_modifications: {
      flashing_arrows: true,
      floodlighting_kw: 2,
      all_red_increase_s: 0
    }
  },
  ttl_if_applicable: {
    mode: "VEHICLE_ACTUATED",
    all_red_work_to_through_s: 5,
    green_work_s: 35,
    green_through_s: 45,
    cycle_s: 90
  },
  compliance_notes: [
    "TCAW Section 5.7.1",
    "Speed zone required (taper >60m)",
    "Manual control SFAIRP documented"
  ]
}
```

---

## Part 11: Critical Thresholds for Code

### 11.1 Speed Thresholds

| Speed | Control | Manual OK | PTCD Req | TTL Eligible | Arrow Req |
|-------|---------|-----------|----------|--------------|-----------|
| ≤30 km/h | BASIC | YES | NO | — | NO |
| 30-45 km/h | MANUAL | YES | — | NO | NO |
| 45-65 km/h | PTCD preferred | YES* | — | YES | NO |
| 65-85 km/h | PTCD | NO | YES | YES | <85: NO |
| >85 km/h | PTCD | NO | YES (req) | YES | YES (req) |

*SFAIRR required

### 11.2 Volume Thresholds

| Volume (vpd) | Control Default | Implication |
|---|---|---|
| <100 | GIVE WAY + ONE LANE (passive) | No traffic controller needed |
| 100-1500 | Manual STOP/SLOW bat OR TTL | Traffic controller required |
| 1500-20000 | PTCD preferred | If >65km/h: PTCD required |
| >20000 | PTCD MANDATORY | Integrate with SCATS/SCOOT |

### 11.3 Distance Thresholds (from D formula)

| D Value | 1D | 1.5D | 2D | 2.5D |
|---------|-----|------|------|------|
| 50 km/h (D≈14m) | 14m | 21m | 28m | 35m |
| 60 km/h (D≈17m) | 17m | 25m | 33m | 42m |
| 80 km/h (D≈22m) | 22m | 33m | 44m | 55m |
| 100 km/h (D≈28m) | 28m | 42m | 56m | 70m |
| 110 km/h (D≈31m) | 31m | 46m | 62m | 77m |

### 11.4 Cone/Marker Spacing

| Speed | Primary Spacing | Work Zone | Notes |
|-------|-----------------|-----------|-------|
| ≤45 km/h | 4m | 4m | Close spacing; high visibility |
| 45-65 km/h | 8m | 8m | Standard |
| 65-85 km/h | 15-20m | 10m | Wider; but tighter in work zone |
| >85 km/h | 30-60m | 15-20m | Flashing arrow preferred; visual clutter risk |

---

## Part 12: Engine Implementation Checklist

### 12.1 Inputs to Capture

- [ ] Speed (km/h)
- [ ] Traffic volume (vpd) — optional, defaults to estimated from time/day
- [ ] Road type (single-carriage, dual-carriage, motorway)
- [ ] Number of lanes
- [ ] Lane being closed (LEFT or RIGHT for single-carriage) ← **Critical**
- [ ] Work duration (hours / days / weeks)
- [ ] Work type (static, dynamic-frequent, dynamic-continuous, dynamic-intermittent)
- [ ] Time of day (day / night)
- [ ] Sight distance to work zone (m)
- [ ] Visibility conditions (clear, reduced, poor)

### 12.2 Decision Logic Sequence

1. **Speed classification** → determine if manual allowed, PTCD required, arrows mandatory
2. **Road geometry** → single/dual carriageway affects taper & merge logic
3. **Work type** → static vs dynamic; determines device type and monitoring
4. **Duration** → TTL eligibility (≤7 days), work convoy implications
5. **Volume + Speed** → if >85km/h or >20k vpd, force PTCD
6. **Sight distance** → if <150m, TTL not eligible; if <300m, single-lane not eligible
7. **Output TGS type** → basic, stop/slow bat, TTL, full closure
8. **Generate sign sequence** → advance warnings, taper, work zone, end
9. **Add speed zone** → if taper >60m or visibility issues
10. **Night modifications** → if night work, add flashing arrows & adjust distances
11. **TTL timing** → if TTL selected, calculate all-red & green times

### 12.3 Output Components

- [ ] TGS Type (enum)
- [ ] Control Method (enum)
- [ ] Speed Zone (start, end, speed value)
- [ ] Taper (length, spacing, side)
- [ ] Sign list (codes, positions, distances)
- [ ] Traffic control requirements (personnel count, equipment)
- [ ] TTL timing (if applicable)
- [ ] Compliance notes (which TCAW sections apply)

---

## Part 13: Test Case — Cosgrove Avenue, Flinders NSW 2529

**Road Data:**
- OSM Way 23202025
- Speed: 50 km/h
- Lanes: 2 (single carriageway, 1 each way)
- Volume: ~500 vpd (estimate)
- Carriageway width: ~6.5m
- Surface: Asphalt

**Hypothetical Scenario:**
- Work duration: 3 days (day+night)
- Work zone length: 60m
- Lane closed: RIGHT (relative to draw direction)
- Time: Daytime → Evening → Overnight
- Visibility: Clear

**Expected Engine Output:**

**Day Phase (7am-5pm):**
```
TGS_TYPE: STOP_SLOW_BAT
CONTROL_METHOD: MANUAL
SPEED_ZONE: 50km/h (unchanged; below 60m taper threshold)
TAPER: 30m (1D advance = 14m @ 50km/h; 1D × 2 for safety)
SIGNS: 
  - T1-1 ROADWORK AHEAD @ -28m
  - T5-4 HAZARD MARKER START @ 0m (lane right)
  - T1-9 WORK ZONE @ 0m
  - T1-10 END ROADWORK @ 60m
  - Recovery delineation: 14m beyond
PERSONNEL: 1 traffic controller (both directions) OR 2 (one per side)
ARROWS: No (speed ≤65km/h)
```

**Night Phase (5pm-6am):**
```
TGS_TYPE: TTL_PORTABLE (replace bat for unmanned operation)
CONTROL_METHOD: TTL / FIXED-TIME
ALL_RED: 2s (stop-line distance ~30m)
GREEN_WORK: 35s
GREEN_THROUGH: 45s
CYCLE: 90s
BEACONS: Not required (speed ≤65km/h); optional for night visibility
SIGNS: All day signs remain; beacon optional on advance sign
```

---

## References & Source Sections

| Topic | TCAW Section |
|-------|---|
| Speed zones & dimension D | 5.2.1 |
| Advance warning | 5.3 |
| Taper rules | 5.4, Appendix D |
| Sign codes & placement | 7.0, Appendix C |
| Manual control | 5.7 |
| PTCD / TTL | 5.6, Appendix B |
| Lane closure (multi-lane) | 5.1, 5.5 |
| Night work | 4.5 |
| Dynamic work | 5.1.3 |
| Pedestrians | 4.4.2 |
| Motorcyclists | 4.4.4 |
| Installation sequence | 6.4 |

---

**Document Status:** APPROVED FOR IMPLEMENTATION  
**Version:** 1.0 (extracted from TCAW v6.1 + TD amendments)  
**Last Updated:** 2026-05-18  
**Next Review:** Before Phase 3 (Decision Engine Code Implementation)
