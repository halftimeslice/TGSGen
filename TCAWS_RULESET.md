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

## Part 12: Dimension D Master Rules & High-Speed Tables (verified TCAWS §7.3, §7.6.2, §6.2.6, §4.5.6)

### 12.1 Dimension D — applies at ALL speeds up to 110 km/h

D (metres) = the speed (km/h) of traffic **at the position where the device is placed**, expressed as metres.
Speed source, in order of preference: measured speed → predicted speed → preceding roadwork speed zone → existing posted limit (Note to Table 7-3).
So D=80 m in an 80 km/h zone, D=110 m in a 110 km/h zone. D must be stated on the TGS (§7.4.1).

Derived requirements (Table 7-2):
| Purpose | Requirement |
|---|---|
| Sight distance to PTCD or traffic controller | ≥ 1.5D |
| Sight distance to end-of-queue | 2D if approach speed >65 km/h; 1.5D if <65 km/h |
| Sign spacing — single advance sign | 2D if approach ≥65 km/h; 1D if <65 km/h (Table 6-3) |
| Sign spacing — multiple advance signs | 1D at all speeds; sign nearest the work placed D before the taper, others at successive D (Table 6-3) |
| Distance between tapers, multi-lane | 1.5D |

### 12.2 Taper lengths by speed band (Table 7-3 — recommended; increase for poor sight distance/compliance)

| Speed at taper (km/h) | Traffic control taper | Lateral shift taper | Merge taper |
|---|---|---|---|
| ≤45 | 15 m | 15 m | 15 m |
| 46–55 | 15 m | 15 m | 30 m |
| 56–65 | 30 m | 30 m | 60 m |
| 66–75 | N/A | 70 m | 115 m |
| 76–85 | N/A | 80 m | 130 m |
| 86–95 | N/A | 90 m | 145 m |
| 96–105 | N/A | 100 m | 160 m |
| >105 | N/A | 110 m | 180 m |

Taper types: traffic control taper (immediately after PTCD/controller position), lateral shift taper (shift without conflicting stream), merge taper (lane merges into another).
Distance BETWEEN successive tapers (Table 7-4): ≤45: 10 m; 46–55: 25 m; 56–65: 70 m; >65: 1.5 × speed (m).
On 3+ lane carriageways closing two lanes: close one lane at a time, tapers ≥1.5D apart (§7.7.3.5).

### 12.3 Safety buffer (§7.6.2.3 — MUST)

- ≥ **30 m** unoccupied space between taper and work area (use the larger of 30 m or 1D where Part 3.2 gives 1D).
- No work, plant, storage or workers in the buffer (except passing through).
- Not required on departure ends, but required at BOTH ends if traffic can approach from both.

### 12.4 Roadwork speed zone lengths (Table 4-10 — MUST)

| Zone | Minimum length | Maximum length |
|---|---|---|
| <35 km/h | 100 m | 200 m |
| 40 km/h | 150 m | 500 m |
| 60 km/h | 150 m | not specified |
| 70 km/h transition | 200 m | not specified |
| 80 km/h | 500 m | not specified |
| 80 km/h transition | 300 m | not specified |

Zones may be OFFSET (different restriction per direction) e.g. shoulder work not affecting the opposing lane (§4.5.5). Do not make zones longer than needed — hurts credibility/compliance.

### 12.5 Sight distances for intermittent work (Table 7-9)

Minimum sight distance = **3D with a lookout person, 6D without** (e.g. 60 km/h: 180 m / 360 m). Applies at all speeds.

---

## Part 13: Pedestrians & Footpaths (verified TCAWS §4.4.2 Table 4-4 as amended by TD 00003, §4.4.3)

### 13.1 Temporary footpaths — MUST

- Clear path of travel, clearly signposted for wayfinding to/from existing pedestrian facilities.
- All-weather standard, incl. ramps over gutters that can run >1 m/s water.
- Material/surface/performance equivalent to adjacent footpaths; no trip hazards for any pedestrian type (wheelchairs, prams, walking frames).
- Width: ≥ **1 m at local constrictions**; ≥ **2 m elsewhere**; more at concentration points (shops, schools, bus/light-rail stops, stations, median crossing points).
- TTM signs/devices must NOT reduce any footpath below 1 m unless an alternative pedestrian facility is provided.

### 13.2 Separation & crossings

- Work area defined by fencing; pedestrians diverted onto roadway must be separated from traffic by mesh fence minimum — else safety barrier, alternative path, or redesign.
- Separate pedestrians from trenches, or plate the trenches.
- If an existing crossing can't be kept, provide an equivalent alternative as near as possible. Prevent crossing (and use active control: pedestrian-actuated signals, PTCD, or a chicane facing oncoming traffic) where medians/refuges split same-direction flows, speeds are high, congregation space is insufficient, or stopping sight distance is unavailable.
- Where traffic runs temporarily in the wrong direction: containment fences, guidance personnel, or T8-5 LOOK BOTH WAYS on both sides facing pedestrians.
- Lighting required for diverted paths at crossings; manage security risk (lighting/cameras/design).

### 13.3 Cyclists (§4.4.3)

- Where provision determined: smooth shoulder ≥ **1.2 m** wide (≥ **2 m** if adjacent lane speed >60 km/h), swept regularly.
- Grooved/milled surfaces: display CYCLE HAZARD GROOVED ROAD (T2-207n) on all approaches.
- Signs above cyclist head height; devices must not force cyclists off safe paths; works affecting cycle ways >1 day must be visible at night.

---

## Part 14: Road Closures & Detours (verified TCAWS §7.7.2.2–7.7.2.4)

### 14.1 Full road closure — MUST

- ROAD CLOSED (T2-4) sign + barrier boards at the start of the closure.
- Speed zones reduced on approach.
- Reduce lanes progressively on approach (e.g. close left lane before right on a 2-lane one-way).
- If an approach/exit lane is closed at an intersection, close the corresponding lane on the OPPOSITE side of the intersection too.
- Ramp closures: reinforce with a continuous/chicaned line of cones at 1 m spacing.
- Property access: provide alternative access, or delineated local-traffic path (LOCAL TRAFFIC ONLY sign, no large gaps in delineation), or pedestrian-only access.

### 14.2 Detours

- DETOUR AHEAD sign (TCAWS code T1-6) or VMS in advance; **first detour marker ≤100 m past it**. Markers mounted horizontally; arrow vertical, 45° up left/right, or horizontal left/right.
- Worker symbolic sign on the left in advance of the work area if workers visible to traffic.
- Side tracks/crossovers: maintaining-authority approval, adequate pavement strength/width for expected traffic, provision for vulnerable users & public transport, local access, delineation (linemarking, guide posts, RRPMs, signs).

---

## Part 15: Intersections & Working at Traffic Signals (verified TCAWS §7.7.4.2, §7.7.3.2)

- Any arrangement affecting signal operation (incl. flashing yellow) needs road occupancy licence approval; TMC implements changes.
- If alternate traffic control is needed at/near signals: **flash the signals yellow AND control ALL approaches** before using a PTCD or STOP/SLOW bat.
- Consider phasing impact of detoured traffic and of closing turn lanes; contact TMC for real-time phasing changes.
- Advertise works in advance (VMS, letter drops, press).
- If pedestrian signals are turned off or a crossing closed: adequate alternative pedestrian provision is mandatory.
- Lane closures at intersections follow §7.7.3.2 (below) + mirrored-closure rule (Part 14.1).

### 15.1 Closing a lane (§7.7.3.2 — MUST)

- ≥ **2 temporary hazard markers (T5-4/T5-5) per closed lane**; cones/bollards form the taper and travel path.
- Hazard markers only on the side primarily guiding traffic away from the hazard — never both sides of a path.
- Work area beyond a crest/curve with <100 m visibility: extend the layout in advance of the crest/curve.
- Multi-lane <85 km/h and <20,000 vpd: consider flashing arrow in addition to/instead of markers; include lane status signs (T2-6 family); TMA where required.
- Multi-lane >85 km/h and >20,000 vpd (or listed motorways): flashing arrow sign **required** at each merge taper, visible from taper installation to removal.
- Dual carriageways: duplicate signs both sides where practical.

---

## Part 16: Shoulder, Verge & Kerbside Work (verified TCAWS §7.7.3.3, §7.7.3.4)

### 16.1 Shoulder closure

- Temporary hazard marker 20 m before the work area + ≥1 more at 20 m spacing in advance; markers ≥1 m from the edge line.
- Barrier board at the beginning and end of the work area.
- SHOULDER CLOSED (T2-19n) placed **D in advance** of the first hazard marker.
- Consider cyclists, buses, resident vehicles and parking that use the shoulder (see Part 13).

### 16.2 Single lane operation — passive GIVE WAY control (§7.7.3.4)

Permitted ONLY when ALL of: ≤100 vpd AND speed <75 km/h AND each entry visible from the other AND work area <100 m long AND ≥300 m sight to opposing traffic beyond the far end for the yielding direction.
- GIVE WAY (R1-2) + ONE LANE (R9-9n) assembly assigns priority; NO OVERTAKING OR PASSING (R6-1) at the start of the single lane for the opposite direction.

---

## Part 17: Mobile / Dynamic Works (verified TCAWS §7.8)

### 17.1 Work categories (§7.8.1)

- **Frequently changing** — regular moves between successive locations, minimal warning needed.
- **Continuous** — progressively moving vehicles along the roadway (e.g. line marking, sweeping).
- **Intermittent** — on travel lanes in gaps in traffic, no adjustment affecting road users.

### 17.2 Works convoys (Table 7-7)

- Shadow vehicle protects workers on foot/plant (see Part 5.6 for distances); tail vehicle follows to warn/divert (a SECOND tail vehicle required on motorway-type roads).
- Advance warning vehicle ~**1 km** behind the convoy; **not required when speed zone <65 km/h with 2D sight distance**.
- All signs/devices mounted on moving convoy vehicles; every convoy vehicle/plant (except minor plant) fitted with a flashing arrow sign.

### 17.3 Frequently changing work — eligibility (§7.8.3 — MUST, else set up static)

- **Within a traffic lane:** speed <65 km/h AND ≤20 min per location (up to 1 h if <40 vph).
- **Median or verge:** sight per Table 7-9 (or 50 m min if not in adjacent lane) AND speed <75 km/h AND per-location duration ≤1 h (<40 vph) / ≤40 min (40–150 vph) / ≤20 min (>150 vph).
- Short-term partial closure without advance warning allowed only if: vehicle warning device visible ≥250 m AND no traffic control needed AND (<20 vpd OR room for two-way traffic past the work).

### 17.4 Minimum controls for frequently changing work (§7.8.3.1)

- Shadow vehicle or works convoy protecting workers/plant; contingency plan to abandon work instantly.
- Rotating/flashing yellow light on every work vehicle, visible ≥150 m (<65 km/h zones) or ≥250 m (elsewhere).
- Sight distances per Table 7-9 (Part 12.5).
- Advance signs ≤**2 km** ahead of each work position; opposing-direction advance signs never >2 km apart; relocate progressively.
- At each advance sign location: Workers symbolic (T1-5) [workers on foot] or ROAD PLANT AHEAD (T1-3-1) [plant only] together with NEXT 2km (T1-28).

### 17.5 Low-volume roads without shadow vehicle (§7.8.3.2)

Allowed only if ALL of: <1500 vpd, following-traffic sight ≥1.5D, ≤2 plant items within sight of each other, posted speed <85 km/h, ≥1.5 m from live traffic. (Typical: grading, resheeting, shoulder grading.)
- Work in subsections ≤2 km (extendable to next turning point, ≤6 km total), all signs up before starting each subsection.
- Sight to vehicle warning sign >250 m throughout: ROADWORK NEXT __km (T1-24) at each end.
- Sight <250 m anywhere: GRADER AHEAD (T1-4) or ROAD PLANT AHEAD (T1-3-1) + NEXT 2km (T1-28) each approach, ≥100 m before any windrow; if traffic speed >75 km/h also impose a <65 km/h speed zone.
- Fresh-surface hazards: post T3-3 slippery / T3-6 soft edges / T3-7 rough surface / T3-13 gravel road / T3-9 loose stones / T3-14 loose surface as applicable.
- >1500 vpd: must run as continuous or static work instead.

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
| Dimension D & high-speed tables (Parts 12) | 7.3, 7.6.2, Table 6-3, Table 7-3/7-4, 4.5.6 |
| Pedestrians/footpaths amended, cyclists (Part 13) | 4.4.2 + TD 00003, 4.4.3 |
| Road closures & detours (Part 14) | 7.7.2.2–7.7.2.4 |
| Intersections & signals (Part 15) | 7.7.4.2, 7.7.3.2 |
| Shoulder/verge, single-lane operation (Part 16) | 7.7.3.3, 7.7.3.4 |
| Mobile/dynamic works (Part 17) | 7.8, Tables 7-6/7-7/7-9 |

---

**Document Status:** APPROVED FOR IMPLEMENTATION  
**Version:** 2.0 (second extraction pass: Parts 12–17 — high-speed tables, pedestrians/footpaths as amended, closures/detours, intersections, shoulder/verge, mobile works)  
**Last Updated:** 2026-07-07  
**Next Review:** Phase 8 (detour + mobile works generation)
