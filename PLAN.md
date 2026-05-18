# TGSgen — Project Plan

## Overview

A web-based Traffic Guidance Scheme (TGS) generator for NSW traffic engineers. The app takes a defined work zone on a satellite map and automatically generates a standards-compliant TGS diagram suitable for formal engineering submission.

---

## Standards & Scope

| Field | Detail |
|---|---|
| Jurisdiction | NSW (v1) |
| Standards | AS 1742.3 + Transport for NSW Traffic Control at Worksites (TCAW) manual |
| Users | Traffic engineers producing formal TGS designs |
| Output | To-scale TGS diagram rendered on satellite map, exportable as PDF |

---

## User Flow

1. User opens the app and navigates to the worksite on a satellite map
2. User defines the work zone by clicking a start and end point on the road — app snaps to the road centreline and builds a road-aligned corridor
3. App auto-fetches road data (classification, speed limit, lanes, width) from OSM — user can review and override any values
4. User fills in work parameters: duration (hours/days/weeks), day or night work, works description, TGS number, engineer name
5. App runs the TGS decision engine and generates the scheme
6. TGS diagram is rendered on the map — signs, tapers, buffers, flow arrows, dimensions
7. User exports to PDF with title block, notes, legend, and north arrow

---

## Architecture

**Frontend only — React web app, no backend required in v1**

| Component | Technology |
|---|---|
| Map & satellite view | Google Maps JavaScript API |
| Work zone drawing | Google Maps Drawing Manager + Roads API snap-to-road |
| Road intelligence | OSM Overpass API (with NSW default fallbacks by road class) |
| TGS decision engine | Pure JavaScript rules engine |
| Sign library | SVG icons sourced from publicly available NSW / AS 1742.3 resources |
| Diagram renderer | Canvas/SVG overlay on the map |
| PDF export | Canvas-to-PDF pipeline (Konva + jsPDF or similar) |

---

## TGS Decision Engine

### Inputs

- Speed environment (from road data)
- Work zone length + width (from road geometry)
- Lane impact — how many lanes closed
- Duration: hours / days / weeks
- Day or night work

### Outputs

- TGS type: basic device layout / stop-slow bat / temporary traffic lights / full road closure
- All required sign codes and positions (placed at TCAW-compliant distances as lat/long)
- Taper length, buffer distance, advance warning distances
- Device and staffing requirements

---

## Road Data & Fallbacks

OSM will often be missing speed limit, lane count, and width on residential streets. The app applies NSW defaults by road class when tags are absent, and always allows engineer override before generation.

| Road Class | Default Speed | Default Lanes | Default Width |
|---|---|---|---|
| Residential | 50 km/h | 2 | 6.5m |
| Tertiary | 60 km/h | 2 | 7m |
| Secondary | 60–80 km/h | 2–4 | 7–10m |
| Primary | 80 km/h | 4+ | 14m+ |
| Motorway | 110 km/h | 2+ each way | Divided |

---

## Diagram Output Requirements

Each generated TGS diagram must include:

- Satellite/aerial base map
- Sign icons placed at calculated positions (NSW TCAW sign codes)
- Taper lines drawn to scale
- Buffer and work zone boundaries
- Traffic flow arrows
- Dimension annotations (taper length, buffer, advance warning distances)
- North arrow and scale bar
- Title block (TGS number, address, works description, engineer, date, revision)
- Notes panel referencing applicable standard
- Legend

---

## Key Risks

| Risk | Mitigation |
|---|---|
| OSM missing road tags | NSW default fallback table + mandatory engineer review before generation |
| Sign icon availability | Source from Transport for NSW open data; recreate from standard if needed |
| TCAW rule accuracy | Hard-code directly from current published TCAW manual; treat as a living reference within the app |
| PDF print quality | Validate renderer against sample diagrams before building full feature set |
| Complex geometry (curves, intersections) | Handle straight roads first in v1; intersections as a v2 feature |

---

## Build Order

| Phase | Component |
|---|---|
| 1 | Map interface + work zone selection tool |
| 2 | Road data fetch + fallback inference layer |
| 3 | TGS decision engine (logic only, tested in isolation) |
| 4 | Sign library (SVGs sourced and catalogued) |
| 5 | Diagram renderer (signs, tapers, buffers, annotations) |
| 6 | Title block + PDF export |

---

## Test Case

**Cosgrove Avenue, Flinders NSW 2529**

| Field | Value |
|---|---|
| OSM Way ID | 23202025 |
| Classification | Residential |
| Speed limit | 50 km/h (NSW default) |
| Lanes | 2 (1 each way, assumed) |
| Carriageway width | ~6.5m (assumed) |
| Surface | Asphalt |
| Total length | ~320m |
| Geometry | 20 coordinate nodes |

Used to validate decision engine output before the visual renderer is built. Hypothetical scenario: 60m work zone, 1 lane closed, daytime, 3-day duration — expected output: stop/slow bat operation.

---

## Data Sources

All data sources are publicly available:

- **OSM Overpass API** — road geometry, classification, speed limits, lane counts
- **Nominatim** — geocoding (address to coordinates)
- **Google Maps JavaScript API** — satellite imagery, map interaction, snap-to-road
- **Transport for NSW TCAW manual** — current publicly available edition (rules engine source of truth)
- **AS 1742.3** — publicly available Australian Standard (sign codes, device requirements)
