# TGSgen Sign Library Catalog
## Complete NSW/AS 1742 Traffic Control Sign Reference
**Source:** TCAW v6.1, AS 1742.3, AS 1742.15, AS 1743:2023  
**Last Updated:** 2026-05-18

---

## Overview

This catalog documents all traffic control signs required for TGSgen's decision engine and diagram renderer. Signs are grouped by function and include:
- Official code (T-series)
- Meaning & description
- Shape & colors (per AS 1743)
- Dimensions & sizes
- Retroreflectivity class
- When used (speed, scenario)
- SVG sourcing notes

---

## Part 1: Sign Categories & Standards

### 1.1 Sign Naming Convention

**NSW Temporary Traffic Management (TTM) Sign Codes:**
- **T1-xxx:** Warning/hazard signs (yellow background, black symbol)
- **T2-xxx:** Motorcycle/cycle hazard signs (yellow background, black symbol)
- **T3-xxx:** Surface condition warnings (yellow background, black symbol)
- **T5-xxx:** Detour/delineation/marker signs (varied colors)
- **R\*-xxx:** Regulatory/permanent traffic signs (red, black, white)
- **VMS-xxx:** Variable Message Signs (LED matrix)

### 1.2 Sign Sizes (AS 1743 Standard)

| Size Code | Dimensions | Use Case | Speed |
|-----------|-----------|----------|-------|
| **A-size** | 300 × 300mm | Low-speed local roads | ≤50 km/h |
| **B-size** | 600 × 600mm | General warning (standard) | 50-65 km/h |
| **C-size** | 900 × 900mm | High-speed roads | 65-85 km/h |
| **D-size** | 1200 × 1200mm | Motorway/very high speed | >85 km/h |

**Rule:** Sign size must be readable from at least 2D distance (D = speed ÷ 3.6 in metres).

### 1.3 Reflectivity Standards (AS 1443)

| Class | Material | Visibility | Use |
|-------|----------|-----------|-----|
| **Class 1** | Reflective | Day + poor light | Standard roadwork |
| **Class 2** | High-intensity reflective | Night visible at 100m | Nightwork essential |
| **Class 3** | Diamond-grade reflective | Night visible at 200m+ | Motorways; high-risk zones |

**TGSgen Rule:** Day work = Class 1+2 minimum; Night work = Class 2+3 required.

### 1.4 Colors per AS 1743

| Color | Hex | Usage | Standard |
|-------|-----|-------|----------|
| **Fluorescent Yellow-Green** | #FFFF00 (approx) | Warning backgrounds; hazard markers | AS 1443 (safety yellow) |
| **Black** | #000000 | Symbols on yellow; text | Contrast requirement |
| **Red** | #DD0000 | Stop/Slow bat; regulatory borders | Regulatory standard |
| **White** | #FFFFFF | Stripes; text on red/dark | Contrast requirement |
| **Orange** (fluorescent) | #FF8C00 (approx) | Alternative warning color | Modern alternative to yellow |
| **Retroreflective White** | #FFFFFF + reflective | Night visibility stripes | Hazard markers |

---

## Part 2: Critical Signs for TGSgen

### T1 Series: Warning & Hazard Signs

#### **T1-1: ROADWORK AHEAD** (Mandatory - all TGS)

**Code:** T1-1  
**Shape:** Diamond (450 × 450mm standard)  
**Colors:** Fluorescent yellow background, black diamond border, black symbol  
**Meaning:** Advance notice of road works ahead; alert drivers to reduce speed  
**Visibility Requirement:** Readable from 2D distance  
**When Used:** Every TGS, placed 2.5D–2D ahead of work zone  
**Speed Dependent:** 
- <65 km/h: B-size (600mm) acceptable
- 65-85 km/h: C-size (900mm) recommended
- >85 km/h: D-size (1200mm) or C-size minimum

**SVG Notes:** 
- Diamond outline in black
- Yellow background fill
- Centered black symbol showing construction (jackhammer or cone)
- Text "ROADWORK AHEAD" below or beside

**Source:** Transport for NSW Traffic Signs register; AS 1742.3 Section 5.3

---

#### **T1-3: SPEED LIMIT (Temporary)**

**Code:** T1-3 (variable speed value)  
**Shape:** Rectangle with speed number  
**Colors:** Black text on white background, red border (if reduced zone)  
**Meaning:** Mandatory speed reduction in work zone  
**Visibility Requirement:** Placed at zone entry and every 1D thereafter on high-speed roads  
**When Used:** 
- Taper >60m → speed zone required
- Visibility <2D → speed zone required
- Mandatory on motorways

**Typical Speed Values:** 25, 30, 40, 50 km/h (in work zone)

**SVG Notes:**
- Rectangle format: width 400-600mm, height 300-450mm
- Red border (40mm thick)
- Black/white background
- Large numeral (speed value) centered
- "KM/H" text below

**Source:** TCAW Section 4.1; AS 1742 Part 1

---

#### **T1-5: WORKERS AHEAD** (Symbolic)

**Code:** T1-5  
**Shape:** Diamond  
**Colors:** Fluorescent yellow background, black symbol  
**Meaning:** Workers present on or near roadway  
**Visibility Requirement:** Readable from 2D  
**When Used:**
- Where workers are visible from road
- Multi-day works with visible crew
- Not required if workers shielded by barriers

**SVG Notes:**
- Yellow diamond
- Black figure symbol (person/worker silhouette)
- May show multiple figures

**Source:** TCAW Section 4.1.2; Transport for NSW sign catalog

---

#### **T1-9: WORK ZONE** (Symbolic)

**Code:** T1-9  
**Shape:** Diamond  
**Colors:** Fluorescent yellow background, black symbol  
**Meaning:** Marks the point where work zone begins; active work area ahead  
**Visibility Requirement:** Placed at taper start; readable at work speed  
**When Used:** 
- At the physical start of work zone
- After taper completion
- Marks transition from traffic control to active work area

**SVG Notes:**
- Yellow diamond
- Black symbol (often cone or barrier icon)
- Simple, high-contrast design

**Source:** TCAW Section 5.0 (Taper & Work Zone Entry)

---

#### **T1-10: END ROADWORK** (or END TRAFFIC HAZARD)

**Code:** T1-10  
**Shape:** Diamond  
**Colors:** Fluorescent yellow background, black symbol  
**Meaning:** Work zone ends; traffic returns to normal; speed limit returns to posted limit  
**Visibility Requirement:** Placed at work zone exit; readable from taper end  
**When Used:**
- Marks physical end of work zone
- Critical for speed derestriction
- Removes all temporary restrictions

**SVG Notes:**
- Yellow diamond
- Black symbol (often X, end marker, or diagonal lines)
- Clear, unambiguous design

**Source:** TCAW Section 5.0 (Work Zone Exit); AS 1742.3

---

#### **T1-10-1n: TRAFFIC HAZARD AHEAD** (Advance warning variant)

**Code:** T1-10-1n  
**Shape:** Diamond  
**Colors:** Fluorescent yellow, black  
**Meaning:** Hazard ahead (dynamic/intermittent work); slower speed required  
**When Used:**
- Dynamic work (crew moving frequently)
- Intermittent work (unpredictable stops)
- Preferred over T1-1 for active operations

**Source:** TCAW Amendment TD 00003:2022; Table 4-6

---

#### **T1-16: ROADWORK (X)KM AHEAD**

**Code:** T1-16 (with variable distance)  
**Shape:** Diamond  
**Colors:** Fluorescent yellow, black  
**Meaning:** Roadwork at stated distance ahead  
**When Used:**
- Extended works (>500m)
- Distance = 5km, 10km, 20km ahead, etc.
- On approaches to major work zones

**SVG Notes:**
- Yellow diamond
- Black text showing distance (e.g., "5 KM", "10 KM")

**Source:** AS 1742.3

---

#### **T1-25: ROADWORK ON SIDE ROAD**

**Code:** T1-25  
**Shape:** Diamond  
**Colors:** Fluorescent yellow, black  
**Meaning:** Roadwork on adjacent road; may affect traffic flow or congestion  
**When Used:**
- When TGS is on a side road affecting main road access
- Context-dependent; low priority for TGSgen v1

**Source:** AS 1742.3

---

#### **T1-34: TRAFFIC CONTROLLER AHEAD**

**Code:** T1-34 (Symbolic)  
**Shape:** Diamond or circular  
**Colors:** Yellow/white background, black symbol  
**Meaning:** Human traffic controller ahead; obey their signals  
**When Used:**
- When manual stop/slow bat is deployed
- Advance notice that hand signals override signs

**SVG Notes:**
- Figure with hand raised (STOP gesture)
- Clear visual symbol

**Source:** TCAW Section 5.7; Transport for NSW catalog

---

### T2 Series: Motorcycle & Cycle Hazards

#### **T2-207n: CYCLE HAZARD — GROOVED ROAD**

**Code:** T2-207n  
**Shape:** Diamond  
**Colors:** Fluorescent yellow background, black symbol  
**Meaning:** Road surface grooved or milled; hazardous for motorcycles/bicycles  
**When Used:**
- When road milling or grooving occurs
- All approach directions
- Mandatory before resurfacing works

**SVG Notes:**
- Yellow diamond
- Black motorcycle/cycle symbol
- May show wavy lines (representing grooves)

**Visibility:** Class 2 minimum (night safety for riders)

**Source:** TCAW Amendment TD 00003:2022, Section 4.4.4

---

### T3 Series: Surface Condition Warnings

#### **T3-1: WET TAR**

**Code:** T3-1  
**Shape:** Diamond  
**Colors:** Fluorescent yellow, black  
**Meaning:** Fresh asphalt or tar; slippery when wet  
**When Used:** Active resurfacing or seal-coat works  
**Visibility:** B-size, Class 1+2  

**Source:** AS 1742.3

---

#### **T3-3: SLIPPERY ROAD** (or SLIPPERY — WHEN WET)

**Code:** T3-3  
**Shape:** Diamond  
**Colors:** Fluorescent yellow, black  
**Meaning:** Road surface has reduced friction; may be slippery  
**When Used:**
- Wet conditions during works
- Gravel sections
- Loose surface areas

**Source:** AS 1742.3; TCAW Amendment TD 00003:2022

---

#### **T3-6: SOFT EDGES**

**Code:** T3-6  
**Shape:** Diamond  
**Colors:** Fluorescent yellow, black  
**Meaning:** Road edge soft or unstable; vehicles must not leave pavement  
**When Used:** Unsealed work areas; edge protection needed  

**Source:** AS 1742.3

---

#### **T3-9: LOOSE GRAVEL** (Symbolic)

**Code:** T3-9  
**Shape:** Diamond  
**Colors:** Fluorescent yellow, black  
**Meaning:** Loose gravel surface ahead; reduced traction  
**When Used:** Temporary gravel work surface; rough pavement  

**Source:** AS 1742.3; TCAW Amendment TD 00003:2022

---

#### **T3-13: GRAVEL ROAD**

**Code:** T3-13  
**Shape:** Diamond  
**Colors:** Fluorescent yellow, black  
**Meaning:** Sealed road becomes temporarily unsealed  
**When Used:** Temporary unsealing; construction haul roads  

**Source:** TCAW Amendment TD 00003:2022, Section 4.4.4

---

#### **T3-14: LOOSE SURFACE**

**Code:** T3-14  
**Shape:** Diamond  
**Colors:** Fluorescent yellow, black  
**Meaning:** General surface instability warning  
**When Used:** Multiple surface hazards present  

**Source:** AS 1742.3

---

#### **T3-37: ROUGH SURFACE**

**Code:** T3-37  
**Shape:** Diamond  
**Colors:** Fluorescent yellow, black  
**Meaning:** Uneven or pothole-prone surface  
**When Used:** Damaged pavement; uneven construction area  

**Source:** TCAW Amendment TD 00003:2022

---

### T5 Series: Delineation, Markers & Directional Signs

#### **T5-2: STOP/SLOW BAT** (Manual Control)

**Code:** T5-2  
**Shape:** Rectangular flag/bat  
**Colors:** Red-white (STOP side), amber-white (SLOW side)  
**Dimensions:** 450 × 600mm typical; hand-held by traffic controller  
**Meaning:** 
- Red side = STOP (mandatory)
- Amber side = SLOW (caution)

**When Used:**
- Manual traffic control at low-speed work zones
- ≤45 km/h (or ≤65 km/h with approval)
- Requires traffic controller on-site

**Visibility:** High-contrast red/white (STOP) and amber/white (SLOW); retroreflective  

**SVG Notes:**
- Rectangular flag design
- Red fill with white border (STOP side)
- Amber/orange fill with white border (SLOW side)
- Text "STOP" or "SLOW" (optional; hand signals primary)

**Source:** TCAW Section 5.7; Transport for NSW standard

---

#### **T5-4: HAZARD WARNING MARKER** (Multiple Chevron)

**Code:** T5-4  
**Shape:** Chevron (multiple strips, V-shaped) — 2 variants: LEFT & RIGHT  
**Colors:** Retroreflective white on yellow background (or yellow on black)  
**Dimensions:**
- Standard: 600mm wide × 900mm tall
- D-size (motorway): 900mm × 1200mm
- Spacing: 4m–60m (varies by speed; closer on high-speed roads)

**Meaning:** Marks edge of work zone; guides traffic around hazard; directional chevron  
**When Used:**
- Every taper (minimum one per lane)
- On approaches to merge points
- Lane closure guidance
- Works both directions (left-pointing → obstacle on left; right-pointing → obstacle on right)

**Placement Rule:**
- Start at taper beginning
- Repeated every 4–30m depending on speed (closer = higher speed needs)
- Line the full taper length

**Visibility:** Class 2 minimum; Class 3 for motorways  

**SVG Notes:**
- Chevron shape (V-point facing traffic direction)
- Retroreflective white fill
- Yellow background (typical; black alternative acceptable)
- Each chevron = separate SVG with orientation

**Source:** TCAW Section 5.5 (Taper); Table D-2; Transport for NSW catalog

---

#### **T5-5: HAZARD WARNING MARKER** (Single Chevron)

**Code:** T5-5  
**Shape:** Chevron (single stripe, V-shaped) — 2 variants: LEFT & RIGHT  
**Colors:** Retroreflective white on yellow (or black) background  
**Dimensions:**
- Standard: 450mm wide × 750mm tall
- Reduced spacing than T5-4 (wider gaps between markers)

**Meaning:** Similar to T5-4 but lighter application; used for longer zones or lower hazard  
**When Used:**
- Extended delineation (beyond taper)
- Buffer zones
- Recovery distance (1D beyond work zone end)
- Secondary guidance lines

**Spacing:** 8m–60m depending on speed  

**SVG Notes:**
- Single V chevron (not double)
- Same color scheme as T5-4
- Smaller footprint

**Source:** TCAW Section 5.5; Transport for NSW catalog

---

#### **T5-15: FLASHING ARROW SIGN** (Variable)

**Code:** T5-15 (directional variants: LEFT, RIGHT, DOWN)  
**Shape:** Large arrow (LED matrix), typically 3000+ mm wide  
**Colors:** Amber LED lights on dark background; flashing mode  
**Meaning:**
- **UP arrow** = Traffic diverts up/ahead
- **DOWN arrow** = Traffic diverts down/ahead
- **LEFT arrow** = Merge left
- **RIGHT arrow** = Merge right

**When Used:**
- Motorways (>85 km/h) — MANDATORY on every merge
- High-traffic areas (>20,000 vpd)
- Nightwork (mandatory for visibility)
- Lane closure (mandatory for dynamic indication)

**Flashing Pattern:** 60–120 flashes per minute (attention-grabbing)  

**Visibility Requirement:**
- Readable from 2.5D distance
- Class 3 (high-intensity)
- Night-visible from 300m+

**SVG Notes:**
- LED array representation (pixel grid)
- Amber color (can be orange or yellow in rendering)
- Animation: flashing state (on/off)

**Source:** TCAW Section 5.5 (Taper); Table D-2; Motorway requirement Section 5.9

---

#### **T5-16: VARIABLE MESSAGE SIGN (VMS)**

**Code:** T5-16 / T1-18n (VMS variant)  
**Shape:** Large LED/electronic display  
**Colors:** Amber/red messages on black background  
**Meaning:** Custom message displayed (e.g., "SLOW DOWN", "ROADWORK AHEAD", distance remaining)  
**When Used:**
- Extended works (>1km)
- Dynamic work (crew positioning updates)
- Advance messaging
- Variable distance warnings

**SVG Notes:**
- Rectangular electronic display
- Example messages: "ROADWORK 2 KM", "PREPARE TO STOP", "SPEED 50"

**Source:** TCAW Section 5.4 (Advance warning options)

---

#### **T5-210n: TEMPORARY PORTABLE RUMBLE STRIP AHEAD** (Symbolic)

**Code:** T5-210n  
**Shape:** Diamond or rectangle  
**Colors:** Fluorescent yellow, black  
**Meaning:** Rumble device (noise/vibration alert) ahead; warns of hazard  
**When Used:**
- When portable rumble strips are deployed
- High-speed approaches
- Warning before major hazard zone

**Source:** TCAW Amendment TD 00003:2022; Section 4.4.3

---

#### **T5-272n: BOOM BARRIER AHEAD** (Symbolic)

**Code:** T5-272n  
**Shape:** Diamond or rectangle  
**Colors:** Fluorescent yellow, black  
**Meaning:** Boom gate or barrier ahead; partial closure  
**When Used:**
- When boom barriers are installed
- Partial lane closure with barrier
- Typical for lane drop-downs

**Source:** TCAW Amendment TD 00003:2022; Section 4.4.3

---

### T6 Series: Pedestrian & Accessibility

#### **T6-4: PEDESTRIAN CROSSING WORKS** (or similar)

**Code:** T6-4 (variant codes may apply)  
**Shape:** Diamond  
**Colors:** Fluorescent yellow, black  
**Meaning:** Pedestrian crossing disrupted or diverted  
**When Used:**
- When footpath or crossing is closed
- Temporary pedestrian route required
- Workers present near pedestrians

**Source:** TCAW Amendment TD 00003:2022, Section 4.4.2 (Pedestrian considerations)

---

## Part 3: Regulatory Signs (Permanent, Applied as Needed)

### Speed Limit Signs (Temporary Versions)

**R2-1, R2-2, R2-3, etc.: SPEED LIMIT (variable)**

**Format:** Red circle, white background, black numeral  
**Code:** R series (regulatory; permanent unless temporary posted)  
**Temporary Version:** Often replaced with temporary T1-3 during works  
**Meaning:** Posted speed limit  
**Colors:** Red circle (40mm border), white background, black numeral  

---

### Traffic Signal Signs

**R2-17: TRAFFIC SIGNALS**

**Shape:** Diamond or square  
**Colors:** White background, black symbol  
**Meaning:** Obeying traffic signals (TTL portable); mandatory stop/go  
**When Used:** TTL installation points  

---

## Part 4: Traffic Light Installation Signs

### Portable Traffic Light (TTL) Installation

**Standard Components:**
1. **Traffic signal head** — Red/Yellow/Green lights (VMS or LED)
2. **Stop-line sign** — Placement mark (white line on road + sign)
3. **Approach warning** — "TRAFFIC SIGNALS" or "PREPARE TO STOP"

**Signal Colors & Meanings:**
- **RED (top)** = STOP (mandatory)
- **YELLOW/AMBER (middle)** = CAUTION; prepare to stop
- **GREEN (bottom)** = GO; proceed with caution

**Flashing Mode:** May flash amber for manual shuttle mode (yield to oncoming traffic)

---

## Part 5: Device Integration & Rules

### 5.1 Sign Sequence for Basic TGS (Single Carriageway, Day Work)

```
Advance Warning Zone (2D ahead):
  ├─ T1-1: ROADWORK AHEAD (primary attention-getter)
  └─ T1-3: SPEED LIMIT [50 km/h] (if taper >60m)

  [1D spacing]

Secondary Warning (1D ahead):
  ├─ T1-1: ROADWORK AHEAD (reiterate)
  └─ T1-3: SPEED LIMIT [50 km/h]

  [approach taper]

Taper Zone (20–130m depending on speed):
  ├─ T5-4/T5-5: HAZARD MARKERS (spaced 4–30m)
  ├─ Cones: Yellow/white delineation (additional guidance)
  └─ T1-9: WORK ZONE (at taper end)

Work Zone (0–100m or more):
  ├─ Active work area
  ├─ Workers present (T1-5 if visible)
  ├─ Speed limit enforced
  └─ Traffic controlled (bat, TTL, or passive)

End Taper (20–130m):
  ├─ T5-4/T5-5: HAZARD MARKERS (continue lining)
  ├─ T1-10: END ROADWORK
  └─ Speed derestriction (return to posted limit)

Recovery Distance (1D):
  ├─ Delineation continues
  └─ Traffic returns to normal

Full Sequence Length: ~2.5D + taper + work + taper + 1D
Example (50 km/h): ~35m + 30m + 60m + 30m + 14m = ~169m minimum
```

### 5.2 TTL Scenario (Two-Way Shuttle)

```
Advance Warning (2.5D–2D ahead):
  ├─ T1-1: ROADWORK AHEAD
  ├─ T1-3: SPEED LIMIT [25–40 km/h]
  └─ Optional: "TRAFFIC SIGNALS" advanced notice

Stop-Line 1 (Approx 30–45m before work):
  ├─ White painted line on road
  ├─ "STOP HERE" or signal approach sign
  └─ Traffic signal head (RED → YELLOW → GREEN)

Work Zone:
  ├─ Single lane; ~30–100m length
  ├─ One-way shuttle operation
  └─ No STOP/SLOW bat (TTL controls traffic)

Stop-Line 2 (Opposite direction):
  ├─ White painted line (same setup)
  ├─ Traffic signal head (opposite direction)
  └─ Timed to alternate (e.g., 35s + 5s intergreen + 45s cycle)

End of Work Zone:
  ├─ T1-10: END ROADWORK
  ├─ Speed derestriction
  └─ Normal traffic resumes
```

### 5.3 Motorway Scenario (Mandatory Flashing Arrow)

```
Advance Warning (2.5D ahead):
  ├─ T1-1: ROADWORK AHEAD
  ├─ T1-3: SPEED LIMIT [80–100 km/h] (reduced)
  └─ Multiple levels (2.5D, 2D, 1.5D)

Merge Point:
  ├─ T5-15: FLASHING ARROW (LEFT/RIGHT, as applicable)
  │  └─ Flashing at 1–2 Hz (high visibility)
  ├─ Large D-size hazard markers (T5-4)
  ├─ Cones: 15–20m spacing
  └─ T1-9: WORK ZONE

Work Zone:
  ├─ Single lane closure
  ├─ Opposing lane continues (separated by barrier or hazard line)
  ├─ Speed enforcement
  └─ High-visibility delineation

Recovery:
  ├─ T1-10: END ROADWORK
  ├─ Delineation continues 1.5D–2D
  └─ Normal motorway speed resumes
```

---

## Part 6: SVG Sourcing & Implementation

### 6.1 Official SVG Sources

**Transport for NSW Catalog:**
- Website: https://www.transport.nsw.gov.au/operations/roads-and-waterways/traffic-signs
- Access: Public; each sign has a design document
- Format: PDF technical drawings (may need conversion to SVG)
- License: State of NSW; suitable for public use

**Austroads Guide:**
- Provides standard sign dimensions & specifications
- Reference for consistency across states

**Commercial Suppliers (for verification):**
- National Safety Signs Australia
- Jaybro
- Traffic Limited (Aust)
- HiVis Signs & Safety

### 6.2 SVG Generation Strategy

For TGSgen v1, recommended approach:

1. **Hand-coded SVG:**
   - T1-1 (diamond + text) — simple geometry
   - T1-3 (rectangle + numeral) — template-based
   - T5-2 (stop/slow bat) — flag shape + colors
   - T5-4, T5-5 (chevrons) — rotate template

2. **Sourced + Traced:**
   - TCAW diagrams (PDF) → potrace/Adobe Illustrator → SVG
   - Maintain exact colors (RGB hex codes)

3. **Libraries:**
   - Consider: [svgo](https://github.com/svg/svgo) for optimization
   - Normalize naming: `t1-1-roadwork-ahead.svg`, `t5-4-left.svg`, etc.

### 6.3 SVG Directory Structure

```
/src/assets/signs/
├── t1/
│   ├── t1-1-roadwork-ahead.svg
│   ├── t1-3-speed-limit.svg
│   ├── t1-5-workers.svg
│   ├── t1-9-work-zone.svg
│   ├── t1-10-end-roadwork.svg
│   ├── t1-16-roadwork-xkm.svg
│   └── t1-34-traffic-controller.svg
├── t2/
│   └── t2-207n-grooved-road.svg
├── t3/
│   ├── t3-1-wet-tar.svg
│   ├── t3-3-slippery.svg
│   ├── t3-9-loose-gravel.svg
│   ├── t3-13-gravel-road.svg
│   ├── t3-37-rough-surface.svg
│   └── ...
├── t5/
│   ├── t5-2-stop-slow-bat-stop.svg
│   ├── t5-2-stop-slow-bat-slow.svg
│   ├── t5-4-chevron-left.svg
│   ├── t5-4-chevron-right.svg
│   ├── t5-5-chevron-left.svg
│   ├── t5-5-chevron-right.svg
│   ├── t5-15-arrow-left.svg
│   ├── t5-15-arrow-right.svg
│   ├── t5-15-arrow-down.svg
│   └── t5-210n-rumble-strip.svg
├── regulatory/
│   ├── r2-1-speed-limit.svg
│   ├── r2-17-traffic-signals.svg
│   └── ...
└── INDEX.json (metadata)
```

### 6.4 INDEX.json Structure (Sign Metadata)

```json
{
  "t1-1": {
    "code": "T1-1",
    "name": "Roadwork Ahead",
    "type": "warning",
    "shape": "diamond",
    "colors": {
      "background": "#FFFF00",
      "border": "#000000",
      "text": "#000000"
    },
    "sizes": {
      "A": { "width": 300, "height": 300 },
      "B": { "width": 600, "height": 600 },
      "C": { "width": 900, "height": 900 },
      "D": { "width": 1200, "height": 1200 }
    },
    "reflectivity": "Class 1 & 2",
    "speed_threshold": "all",
    "mandatory": true,
    "tcaw_section": "5.3",
    "svg_file": "t1/t1-1-roadwork-ahead.svg"
  },
  "t5-4-left": {
    "code": "T5-4-LEFT",
    "name": "Hazard Marker Chevron (Left)",
    "type": "delineation",
    "shape": "chevron",
    "colors": {
      "background": "#FFFF00",
      "reflective": "#FFFFFF",
      "border": "#000000"
    },
    "sizes": {
      "standard": { "width": 600, "height": 900 },
      "large": { "width": 900, "height": 1200 }
    },
    "spacing_m": "4-30",
    "reflectivity": "Class 2-3",
    "speed_threshold": "all",
    "mandatory": true,
    "tcaw_section": "5.5",
    "svg_file": "t5/t5-4-chevron-left.svg"
  }
}
```

---

## Part 7: Decision Engine Sign Selection Rules

### 7.1 Mandatory Sign Matrix

| Speed | Scenario | T1-1 | T1-3 | T1-9 | T1-10 | T5-4 | T5-15 | Notes |
|-------|----------|------|------|------|-------|------|-------|-------|
| <45 km/h | Manual bat | ✓ | — | ✓ | ✓ | ✓ | — | Basic TGS |
| 45-65 km/h | PTCD | ✓ | ✓ | ✓ | ✓ | ✓ | — | Speed zone if taper >60m |
| 65-85 km/h | PTCD | ✓ | ✓ | ✓ | ✓ | ✓ | Optional | Arrow if dynamic work |
| >85 km/h | Motorway | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Mandatory arrow |

### 7.2 Conditional Signs

**T1-5 (Workers):** IF workers_visible AND static_work
**T3-x (Surface):** IF surface_hazard_detected (wet, gravel, rough)
**T5-210n (Rumble):** IF rumble_devices_deployed
**T5-272n (Boom):** IF boom_barrier_deployed

### 7.3 Size Selection Rule (Engine Logic)

```
IF speed <= 50 km/h:
  size = A or B (300–600mm)
ELSE IF speed <= 65 km/h:
  size = B or C (600–900mm)
ELSE IF speed <= 85 km/h:
  size = C (900mm)
ELSE:  // >85 km/h
  size = D (1200mm) or C minimum

// Night work increases size one step
IF night_work:
  size = next_larger_size()
```

---

## Part 8: Color & Styling Consistency

### 8.1 Tailwind/CSS Variables (for web app)

```css
/* Sign Colors */
--sign-yellow: #FFFF00;
--sign-orange: #FF8C00;
--sign-red: #DD0000;
--sign-white: #FFFFFF;
--sign-black: #000000;
--sign-green: #00AA00;
--sign-amber: #FFAA00;

/* Reflectivity Classes */
--reflective-class1: opacity 0.7;
--reflective-class2: opacity 0.85;
--reflective-class3: opacity 1.0;

/* Text on Signs */
--sign-text-font: 'Transport', 'Helvetica', sans-serif;
--sign-text-weight: 700;
--sign-text-size-large: 72px;
--sign-text-size-medium: 48px;
--sign-text-size-small: 32px;
```

### 8.2 Night Rendering

- Increase opacity/glow effect for retroreflective elements
- Add subtle shadow/halo on T5-15 (arrow) for LED effect
- Consider reducing background opacity of non-reflective signs

---

## Part 9: References & Links

| Resource | URL | Notes |
|----------|-----|-------|
| Transport for NSW Signs Register | https://www.transport.nsw.gov.au/operations/roads-and-waterways/traffic-signs | Official sign catalog; searchable |
| AS 1742.3 (Manual of Uniform Traffic Control Devices) | standards.transport.nsw.gov.au | Australian Standard (purchase required) |
| AS 1742.15 (Direction Signs, Information Signs) | standards.transport.nsw.gov.au | Road sign specs & sizing |
| AS 1743:2023 (Road Signs—Specifications) | standards.transport.nsw.gov.au | Graphics, fonts, materials |
| TCAW v6.1 (Traffic Control at Work Sites) | https://www.transport.nsw.gov.au/operations/roads-and-waterways/business-and-industry/partners-and-suppliers/traffic-engineering-4-3 | Full manual; free PDF |
| National Safety Signs Australia | nationalsafetysigns.com.au | Sign sourcing reference |
| Jaybro (Australian sign supplier) | jaybro.com.au | Commercial reference |
| Austroads Guide (National standard) | austroads.com.au | Multi-state consistency |

---

## Part 10: Implementation Checklist

### Phase 4 (Sign Library) Deliverables

- [ ] **SVG Library Complete**
  - [ ] T1 series (T1-1, T1-3, T1-5, T1-9, T1-10, T1-16, T1-34)
  - [ ] T2 series (T2-207n)
  - [ ] T3 series (T3-1, T3-3, T3-9, T3-13, T3-37)
  - [ ] T5 series (T5-2, T5-4-left, T5-4-right, T5-5-left, T5-5-right, T5-15 variants)
  - [ ] Regulatory series (R2-1 speed limit template, R2-17)

- [ ] **INDEX.json Complete**
  - [ ] All sign metadata
  - [ ] Size lookup tables
  - [ ] Color hex codes verified
  - [ ] Speed thresholds documented

- [ ] **React Component Library**
  - [ ] `<SignComponent code={T1-1} size="C" />` — renders SVG with size scaling
  - [ ] Support for dynamic text (speed value in T1-3)
  - [ ] Support for directional variants (T5-4-left vs right, T5-15 arrow directions)
  - [ ] Night mode styling (increased opacity for night work)

- [ ] **Color & Styling Guide**
  - [ ] Tailwind classes defined
  - [ ] CSS variables for consistency
  - [ ] Contrast verification (WCAG AA minimum for visibility)

- [ ] **Testing**
  - [ ] All signs render at correct sizes
  - [ ] Colors match AS 1743 specs
  - [ ] SVG files optimized (<50KB each)
  - [ ] Mobile rendering correct

---

**Document Status:** COMPLETE FOR IMPLEMENTATION  
**Version:** 1.0  
**Last Updated:** 2026-05-18  

---

**Next Steps:** 
1. Finalize SVG sourcing & conversion (PT 1-2 days if using hand-coded approach)
2. Build React sign component library (PT 1 day)
3. Integrate with decision engine output (Phase 3 → Phase 4 linkage)
