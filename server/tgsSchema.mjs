// The exact shape the AI must return — a JSON schema the API enforces.
// Kept close to the app's TGSResult type so the renderer can draw it directly.
// Structured-output rules: additionalProperties:false everywhere, no numeric
// min/max constraints (the automatic checker validates numbers instead).

const placedSign = {
  type: 'object',
  additionalProperties: false,
  required: ['code', 'distanceM', 'approach', 'roadName', 'description', 'sizeClass'],
  properties: {
    code: { type: 'string', description: 'Sign code from the sign library, e.g. T1-1' },
    distanceM: { type: 'number', description: 'Metres from work zone start along the road; negative = on the approach before the work zone' },
    approach: { type: 'string', enum: ['A', 'B', 'both', 'side-road'] },
    roadName: { type: ['string', 'null'], description: 'Only for side-road signs: the name of the side road' },
    description: { type: 'string' },
    sizeClass: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
  },
}

export const TGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'tgsType', 'controlMethod', 'D', 'workZoneLength', 'taperLength', 'coneSpacingM',
    'speedZone', 'advanceWarning', 'phases', 'signs', 'ttlTiming', 'personnelRequired',
    'flashingArrowRequired', 'bufferLength', 'delineatorCount', 'sideRoads',
    'complianceNotes', 'warnings', 'justification',
  ],
  properties: {
    tgsType: { type: 'string', enum: ['BASIC_DEVICES', 'STOP_SLOW_BAT', 'TTL_PORTABLE', 'FULL_CLOSURE'] },
    controlMethod: { type: 'string', enum: ['PASSIVE', 'MANUAL', 'PTCD'] },
    D: { type: 'number', description: 'The D dimension in metres per the TCAWS tables for this speed' },
    workZoneLength: { type: 'number' },
    taperLength: { type: 'number', description: 'Taper length in metres at each end' },
    coneSpacingM: { type: 'number' },
    speedZone: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['speedKmh', 'startDistanceM', 'endDistanceM'],
      properties: {
        speedKmh: { type: 'number' },
        startDistanceM: { type: 'number' },
        endDistanceM: { type: 'number' },
      },
    },
    advanceWarning: {
      type: 'object',
      additionalProperties: false,
      required: ['distanceM', 'levels', 'spacingM'],
      properties: {
        distanceM: { type: 'number' },
        levels: { type: 'integer' },
        spacingM: { type: 'number' },
      },
    },
    phases: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['phase', 'tgsType', 'controlMethod', 'notes'],
        properties: {
          phase: { type: 'string', enum: ['DAY', 'OVERNIGHT'] },
          tgsType: { type: 'string', enum: ['BASIC_DEVICES', 'STOP_SLOW_BAT', 'TTL_PORTABLE', 'FULL_CLOSURE'] },
          controlMethod: { type: 'string', enum: ['PASSIVE', 'MANUAL', 'PTCD'] },
          notes: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    signs: { type: 'array', items: placedSign },
    ttlTiming: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['greenWorkS', 'greenThroughS', 'allRedS', 'cycleS', 'mode'],
      properties: {
        greenWorkS: { type: 'number' },
        greenThroughS: { type: 'number' },
        allRedS: { type: 'number' },
        cycleS: { type: 'number' },
        mode: { type: 'string', enum: ['MANUAL_SHUTTLE', 'FIXED_TIME', 'VEHICLE_ACTUATED'] },
      },
    },
    personnelRequired: { type: 'integer' },
    flashingArrowRequired: { type: 'boolean' },
    bufferLength: { type: 'number' },
    delineatorCount: { type: 'integer' },
    sideRoads: {
      type: 'array',
      description: 'Treatment for each intersecting road within the work area',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['wayId', 'name', 'treatment', 'signs', 'notes'],
        properties: {
          wayId: { type: 'string', description: 'The wayId of the intersecting road as given in the input' },
          name: { type: ['string', 'null'] },
          treatment: { type: 'string', enum: ['CONTROLLER', 'GIVE_WAY', 'ROAD_CLOSURE'] },
          signs: { type: 'array', items: placedSign },
          notes: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    complianceNotes: { type: 'array', items: { type: 'string' } },
    warnings: { type: 'array', items: { type: 'string' } },
    justification: { type: 'string', description: 'Plain-language explanation of the key design decisions and which TCAWS provisions drove them' },
  },
}
