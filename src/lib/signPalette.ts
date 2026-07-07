// Signs the engineer can add to a generated TGS by hand. Codes must exist in
// SignIcon so the map and diagram can draw them.

export type PaletteSign = {
  code: string
  description: string
}

export const SIGN_PALETTE: PaletteSign[] = [
  { code: 'T1-1', description: 'Roadwork Ahead' },
  { code: 'T1-3', description: 'Speed Limit (temporary)' },
  { code: 'T1-4', description: 'Prepare to Stop' },
  { code: 'T1-5', description: 'Workers Ahead' },
  { code: 'T1-6', description: 'Lanes Merge' },
  { code: 'T1-9', description: 'Work Zone' },
  { code: 'T1-10', description: 'End Roadwork' },
  { code: 'T1-16', description: 'Roadwork X km Ahead' },
  { code: 'T1-25', description: 'Roadwork on Side Road' },
  { code: 'T1-34', description: 'Traffic Controller Ahead' },
  { code: 'T2-6', description: 'Road Closed' },
  { code: 'T3-3', description: 'Slippery Road' },
  { code: 'T3-9', description: 'Loose Gravel' },
  { code: 'T3-37', description: 'Rough Surface' },
  { code: 'T5-2-stop', description: 'Stop/Slow Bat — controller position' },
  { code: 'T5-15-left', description: 'Flashing Arrow (left)' },
  { code: 'T5-15-right', description: 'Flashing Arrow (right)' },
  { code: 'T5-16', description: 'Variable Message Sign' },
  { code: 'T6-4', description: 'Pedestrian Works / Crossing' },
]
