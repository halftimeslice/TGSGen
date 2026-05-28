# TGSgen — Handover Note (2026-05-26)

## What we did today

**Topic: Roundabout tool planning — discussion only, no code written.**

Worked through how OSM roundabout data is structured and designed the section model for the roundabout work zone tool.

---

## Roundabout section model (agreed and locked)

Each **section** = the arc of the ring between two consecutive arm connection points, going clockwise. Dividers sit at the arm connection nodes on the ring.

For a 4-arm roundabout (A → B → C → D clockwise):
- **Section A** = arc from arm A to arm B. Physically carries traffic that entered from A and will exit at B.
- **Section B** = arc B → C, **Section C** = C → D, **Section D** = D → A.

The key insight: the **approach lane of arm A** and the **exit lane of arm B** are on the same arc — section A. This is what defines sections.

---

## Auto-closure logic

System detects entry arm (from start pin) and exit arm (from end pin), then closes all sections in the clockwise arc between them:

| Movement | Sections closed |
|---|---|
| Left turn (1st exit) | 1 |
| Straight (2nd exit) | 2 |
| Right turn (3rd exit) | 3 |

Closed = red. Open = green. Section count = OSM arm count.

---

## Not yet designed

- Exact visual/UX of the sector overlay on the map
- How approach roads connect into the ring visually
- Mini-roundabouts (`highway=mini_roundabout` node — completely different OSM structure)
- Full ring closure (separate tool, detour TGS)
