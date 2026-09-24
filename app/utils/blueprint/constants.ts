export type Layout = 'grid' | 'rulers'
export type Subdivision = 2 | 4 | 5 | 10
export type ColorRole = 'bg' | 'major' | 'minor' | 'plus'
export type BlueprintColors = Record<ColorRole, string>

export type ExportTarget = 'print' | 'screen'
export type ExportFormat = 'png' | 'svg'
export type Dpi = 150 | 300 | 600
export type Scale = 1 | 2 | 3

/** The part of the state that decides what the blueprint looks like. */
export interface BlueprintDesign {
  layout: Layout
  /** Major spacing in mm. */
  major: number
  sub: Subdivision
  /** Cross half-arm in mm. */
  cross: number
  colors: BlueprintColors
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
export const SUBDIVISIONS: Subdivision[] = [2, 4, 5, 10]
export const DPI_OPTIONS: Dpi[] = [150, 300, 600]
export const SCALE_OPTIONS: Scale[] = [1, 2, 3]

export const THEMES: Theme[] = [
  { id: 'classic', name: 'Classic', colors: { bg: '#1f5fc8', major: '#8fc4ff', minor: '#9cc8ff', plus: '#ffffff' } },
  { id: 'cyan', name: 'Cyanotype', colors: { bg: '#123c73', major: '#a9d3ff', minor: '#7fb2ea', plus: '#f4f9ff' } },
  { id: 'night', name: 'Night', colors: { bg: '#0f1c2e', major: '#4f7bb0', minor: '#35557d', plus: '#ffb547' } },
  { id: 'graphite', name: 'Graphite', colors: { bg: '#23272e', major: '#8a96a8', minor: '#5c6675', plus: '#e8edf3' } }
]

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
  layout: 'grid',
  major: 50,
  sub: 5,
  cross: 6,
  colors: { ...THEMES[0]!.colors }
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
