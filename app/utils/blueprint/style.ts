import type { BlueprintDesign, GridStyle, GridWeights, WeightKey } from './constants'
import {
  DEFAULT_DESIGN,
  GRID_FITS,
  MARGIN_MAX,
  MARGIN_MIN,
  MARK_STYLES,
  RULER_CLEAR_MAX,
  RULER_CLEAR_MIN,
  RULER_SIDES,
  RULER_UNITS,
  STYLE_PRESETS,
  WEIGHT_LIMITS,
  copyStyle
} from './constants'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const oneOf = <T>(list: readonly T[], v: unknown): v is T => list.includes(v as T)

export function clampWeight(key: WeightKey, v: number) {
  const [lo, hi] = WEIGHT_LIMITS[key]
  return clamp(v, lo, hi)
}

/**
 * A valid, clamped copy of `v`, or null if it isn't a grid style at all.
 * Guards persisted state: only enums, booleans and finite numbers reach the SVG.
 */
export function normalizeStyle(v: unknown): GridStyle | null {
  if (!v || typeof v !== 'object') return null
  const s = v as Record<string, unknown>
  const w = s.weights as Record<string, unknown> | undefined
  if (
    !oneOf(MARK_STYLES, s.majorStyle) || !oneOf(MARK_STYLES, s.minorStyle)
    || !oneOf(RULER_UNITS, s.rulerUnits) || !oneOf(GRID_FITS, s.fit)
    || !Array.isArray(s.rulerSides)
    || !isNum(s.rulerClear) || !isNum(s.margin)
    || !w || typeof w !== 'object'
    || !(Object.keys(WEIGHT_LIMITS) as WeightKey[]).every(k => isNum(w[k]))
  ) return null
  const bools = ['crosses', 'edgeCrosses', 'rulers', 'border', 'titleBlock'] as const
  if (!bools.every(k => typeof s[k] === 'boolean')) return null

  const weights = Object.fromEntries(
    (Object.keys(WEIGHT_LIMITS) as WeightKey[]).map(k => [k, clampWeight(k, w[k] as number)])
  ) as unknown as GridWeights
  return {
    majorStyle: s.majorStyle,
    minorStyle: s.minorStyle,
    crosses: s.crosses as boolean,
    edgeCrosses: s.edgeCrosses as boolean,
    rulers: s.rulers as boolean,
    rulerSides: RULER_SIDES.filter(side => (s.rulerSides as unknown[]).includes(side)),
    rulerUnits: s.rulerUnits,
    rulerClear: clamp(s.rulerClear, RULER_CLEAR_MIN, RULER_CLEAR_MAX),
    margin: clamp(s.margin, MARGIN_MIN, MARGIN_MAX),
    border: s.border as boolean,
    fit: s.fit,
    titleBlock: s.titleBlock as boolean,
    weights
  }
}

/** Default design with a preset's layers and cross size applied. */
export function presetDesign(id: string, overrides: Partial<BlueprintDesign> = {}): BlueprintDesign {
  const p = STYLE_PRESETS.find(p => p.id === id) ?? STYLE_PRESETS[0]!
  return { ...DEFAULT_DESIGN, cross: p.cross, style: copyStyle(p.style), ...overrides }
}

function sameStyle(a: GridStyle, b: GridStyle) {
  return (Object.keys(a) as (keyof GridStyle)[]).every((k) => {
    if (k === 'rulerSides') return a.rulerSides.join() === b.rulerSides.join()
    if (k === 'weights') return (Object.keys(a.weights) as WeightKey[]).every(w => a.weights[w] === b.weights[w])
    return a[k] === b[k]
  })
}

/** Id of the preset the design currently matches, or `custom`. */
export function matchStylePreset(design: Pick<BlueprintDesign, 'cross' | 'style'>) {
  return STYLE_PRESETS.find(p => p.cross === design.cross && sameStyle(p.style, design.style))?.id ?? 'custom'
}
