export type Subdivision = 2 | 4 | 5 | 10
export type ColorRole = 'bg' | 'major' | 'minor' | 'plus' | 'ruler'
export type BlueprintColors = Record<ColorRole, string>

export type ExportTarget = 'print' | 'screen'
export type ExportFormat = 'png' | 'svg'
export type Dpi = 150 | 300 | 600
export type Scale = 1 | 2 | 3

export type MarkStyle = 'lines' | 'dots' | 'none'
export type RulerSide = 'top' | 'right' | 'bottom' | 'left'
/** `mixed`: cm on top/left, inches on bottom/right (make_blueprint_rulers.py). */
export type RulerUnits = 'mixed' | 'cm' | 'inch'
/** `cells`: whole major cells centred inside the margin. `sheet`: frame at the margin, not snapped. */
export type GridFit = 'cells' | 'sheet'

/** Stroke widths and dot radius in mm; opacity 0–1. */
export interface GridWeights {
  minor: number
  minorOpacity: number
  major: number
  border: number
  cross: number
  dot: number
}
export type WeightKey = keyof GridWeights

/** Which layers are drawn and how. */
export interface GridStyle {
  majorStyle: MarkStyle
  minorStyle: MarkStyle
  crosses: boolean
  /** Crosses on the border / frame line. */
  edgeCrosses: boolean
  rulers: boolean
  /** Canonical order (RULER_SIDES); kept while rulers are off. */
  rulerSides: RulerSide[]
  rulerUnits: RulerUnits
  /** mm next to a ruler side kept free of dots and crosses. */
  rulerClear: number
  /** mm from the trim edge to the grid / frame. */
  margin: number
  border: boolean
  fit: GridFit
  titleBlock: boolean
  weights: GridWeights
}

/** The part of the state that decides what the blueprint looks like. */
export interface BlueprintDesign {
  /** Major spacing in mm. */
  major: number
  sub: Subdivision
  /** Cross half-arm in mm. */
  cross: number
  colors: BlueprintColors
  style: GridStyle
}

export interface ExportSettings {
  target: ExportTarget
  preset: string
  /** mm for print, px for screen. */
  width: number
  height: number
  /** mm, print only. */
  bleed: number
  format: ExportFormat
  dpi: Dpi
  scale: Scale
}

export interface Theme {
  id: string
  name: string
  colors: BlueprintColors
}

export interface StylePreset {
  id: string
  name: string
  cross: number
  style: GridStyle
}

export interface SizePreset {
  id: string
  label: string
  width: number
  height: number
}

/** On-screen scale at 100% zoom. */
export const PX_PER_MM = 2
export const MM_PER_INCH = 25.4

export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 4

export const MAJOR_MIN = 20
export const MAJOR_MAX = 120
export const MAJOR_STEP = 5
export const CROSS_MIN = 2
export const CROSS_MAX = 12
export const MARGIN_MIN = 0
export const MARGIN_MAX = 100
export const RULER_CLEAR_MIN = 0
export const RULER_CLEAR_MAX = 20
/** [min, max, step] per weight. */
export const WEIGHT_LIMITS: Record<WeightKey, [number, number, number]> = {
  minor: [0.1, 1.5, 0.05],
  minorOpacity: [0.1, 1, 0.05],
  major: [0.1, 2, 0.05],
  border: [0.1, 2, 0.05],
  cross: [0.2, 2, 0.05],
  dot: [0.1, 1.5, 0.05]
}
export const MARK_STYLES: MarkStyle[] = ['lines', 'dots', 'none']
export const RULER_SIDES: RulerSide[] = ['top', 'right', 'bottom', 'left']
export const RULER_UNITS: RulerUnits[] = ['mixed', 'cm', 'inch']
export const GRID_FITS: GridFit[] = ['cells', 'sheet']
export const SUBDIVISIONS: Subdivision[] = [2, 4, 5, 10]
export const DPI_OPTIONS: Dpi[] = [150, 300, 600]
export const SCALE_OPTIONS: Scale[] = [1, 2, 3]

export const THEMES: Theme[] = [
  { id: 'classic', name: 'Classic', colors: { bg: '#1f5fc8', major: '#8fc4ff', minor: '#9cc8ff', plus: '#ffffff', ruler: '#ffffff' } },
  { id: 'cyan', name: 'Cyanotype', colors: { bg: '#123c73', major: '#a9d3ff', minor: '#7fb2ea', plus: '#f4f9ff', ruler: '#f4f9ff' } },
  { id: 'night', name: 'Night', colors: { bg: '#0f1c2e', major: '#4f7bb0', minor: '#35557d', plus: '#ffb547', ruler: '#ffb547' } },
  { id: 'graphite', name: 'Graphite', colors: { bg: '#23272e', major: '#8a96a8', minor: '#5c6675', plus: '#e8edf3', ruler: '#e8edf3' } }
]

const ALL_SIDES: RulerSide[] = [...RULER_SIDES]

/** Presets set the layers and cross size; spacing and colours stay as they are. */
export const STYLE_PRESETS: StylePreset[] = [
  {
    // make_blueprint.py
    id: 'grid',
    name: 'Grid + crosses',
    cross: 6,
    style: {
      majorStyle: 'lines',
      minorStyle: 'lines',
      crosses: true,
      edgeCrosses: true,
      rulers: false,
      rulerSides: ALL_SIDES,
      rulerUnits: 'mixed',
      rulerClear: 8,
      margin: 50,
      border: true,
      fit: 'cells',
      titleBlock: false,
      weights: { minor: 0.3, minorOpacity: 0.35, major: 0.6, border: 0.6, cross: 0.9, dot: 0.3 }
    }
  },
  {
    // make_blueprint_rulers.py
    id: 'rulers',
    name: 'Rulers + dots',
    cross: 4,
    style: {
      majorStyle: 'none',
      minorStyle: 'dots',
      crosses: true,
      edgeCrosses: false,
      rulers: true,
      rulerSides: ALL_SIDES,
      rulerUnits: 'mixed',
      rulerClear: 8,
      margin: 12,
      border: true,
      fit: 'sheet',
      titleBlock: true,
      weights: { minor: 0.3, minorOpacity: 0.35, major: 0.6, border: 0.4, cross: 0.6, dot: 0.3 }
    }
  },
  {
    id: 'drafting',
    name: 'Drafting',
    cross: 4,
    style: {
      majorStyle: 'lines',
      minorStyle: 'lines',
      crosses: false,
      edgeCrosses: false,
      rulers: true,
      rulerSides: ['bottom', 'left'],
      rulerUnits: 'cm',
      rulerClear: 8,
      margin: 12,
      border: true,
      fit: 'sheet',
      titleBlock: true,
      weights: { minor: 0.2, minorOpacity: 0.3, major: 0.4, border: 0.5, cross: 0.6, dot: 0.3 }
    }
  },
  {
    id: 'dots',
    name: 'Dot journal',
    cross: 4,
    style: {
      majorStyle: 'dots',
      minorStyle: 'dots',
      crosses: false,
      edgeCrosses: false,
      rulers: false,
      rulerSides: ALL_SIDES,
      rulerUnits: 'cm',
      rulerClear: 8,
      margin: 15,
      border: false,
      fit: 'sheet',
      titleBlock: false,
      weights: { minor: 0.3, minorOpacity: 0.35, major: 0.6, border: 0.4, cross: 0.6, dot: 0.35 }
    }
  }
]

export const DEFAULT_STYLE_PRESET = 'grid'

/** A deep copy, so presets never share arrays with the store. */
export function copyStyle(s: GridStyle): GridStyle {
  return { ...s, rulerSides: [...s.rulerSides], weights: { ...s.weights } }
}

export const PRESETS: Record<ExportTarget, SizePreset[]> = {
  print: [
    { id: 'mat', label: 'Desk mat', width: 900, height: 400 },
    { id: 'matxl', label: 'Mat XL', width: 1200, height: 600 },
    { id: 'mouse', label: 'Mouse pad', width: 450, height: 400 }
  ],
  screen: [
    { id: 'fhd', label: '1080p', width: 1920, height: 1080 },
    { id: 'qhd', label: '1440p', width: 2560, height: 1440 },
    { id: 'uhd', label: '4K', width: 3840, height: 2160 },
    { id: 'mbp', label: 'MBP 14″', width: 3024, height: 1964 },
    { id: 'uw', label: 'Ultrawide', width: 3440, height: 1440 },
    { id: 'phone', label: 'Phone', width: 1179, height: 2556 }
  ]
}

/** Preset a target switches to when it is picked. */
export const DEFAULT_PRESET: Record<ExportTarget, string> = { print: 'mat', screen: 'qhd' }

export const DEFAULT_DESIGN: BlueprintDesign = {
  major: 50,
  sub: 5,
  cross: STYLE_PRESETS[0]!.cross,
  colors: { ...THEMES[0]!.colors },
  style: copyStyle(STYLE_PRESETS[0]!.style)
}

export const DEFAULT_THEME = 'classic'

export const DEFAULT_EXPORT: ExportSettings = {
  target: 'print',
  preset: 'mat',
  width: 900,
  height: 400,
  bleed: 20,
  format: 'png',
  dpi: 300,
  scale: 2
}
