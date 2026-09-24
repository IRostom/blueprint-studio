import type { BlueprintDesign } from './constants'
import { MM_PER_INCH } from './constants'

export type Line = [x1: number, y1: number, x2: number, y2: number]
export interface Point { x: number, y: number }
export interface Label { x: number, y: number, text: string, anchor?: 'start' | 'end', size?: number, weight?: number }

const EPS = 1e-6

/** Positive modulo, so a centred origin always lands inside the first tile. */
const mod = (v: number, n: number) => ((v % n) + n) % n

/* ------------------------------------------------------------------------ */
/* Viewport: unbounded field centred on a w×h px box (design-reference)     */
/* ------------------------------------------------------------------------ */

export interface ViewportGeometry {
  /** Major and minor spacing in px. */
  M: number
  m: number
  /** Offset of the first major / minor line from the top-left corner, px. */
  ox: number
  oy: number
  mox: number
  moy: number
  crosses: Point[]
  /** Full cross length and stroke thickness, px. */
  arm: number
  thickness: number
  /** Dot radius for the rulers layout, px. */
  dotRadius: number
}

export function viewportGeometry(w: number, h: number, p: number, design: BlueprintDesign): ViewportGeometry {
  const M = design.major * p
  const m = M / design.sub
  const ox = mod(w / 2, M)
  const oy = mod(h / 2, M)
  const mox = mod(w / 2, m)
  const moy = mod(h / 2, m)
  const arm = Math.max(5, design.cross * 2 * p * (design.layout === 'grid' ? 1 : 0.7))
  const thickness = p >= 1.5 ? 1.5 : 1
  const dotRadius = Math.max(0.6, Math.min(1.4, m * 0.06))

  const crosses: Point[] = []
  if (M >= 8) {
    for (let x = ox; x <= w + 0.5; x += M) {
      for (let y = oy; y <= h + 0.5; y += M) crosses.push({ x, y })
    }
  }

  return { M, m, ox, oy, mox, moy, crosses, arm, thickness, dotRadius }
}

/* ------------------------------------------------------------------------ */
/* Sheet, layout A: bounded grid + crosses (make_blueprint.py). Units: mm   */
/* ------------------------------------------------------------------------ */

/** Distance from the trim edge to the grid border (make_blueprint.py: 900 → 800). */
export const GRID_MARGIN = 50

export const GRID_STYLE = {
  minorWidth: 0.3,
  minorOpacity: 0.35,
  majorWidth: 0.6,
  borderWidth: 0.6,
  plusWidth: 0.9
} as const

export interface GridSheetGeometry {
  x0: number
  y0: number
  cols: number
  rows: number
  gridW: number
  gridH: number
  minor: Line[]
  major: Line[]
  crosses: Point[]
  /** Cross half-arm, mm. */
  arm: number
}

export function gridSheetGeometry(canvasW: number, canvasH: number, bleed: number, design: BlueprintDesign): GridSheetGeometry {
  const { major, sub } = design
  const minorStep = major / sub
  const trimW = canvasW - 2 * bleed
  const trimH = canvasH - 2 * bleed
  const cols = Math.max(1, Math.floor((trimW - 2 * GRID_MARGIN) / major + EPS))
  const rows = Math.max(1, Math.floor((trimH - 2 * GRID_MARGIN) / major + EPS))
  const gridW = cols * major
  const gridH = rows * major
  const x0 = (canvasW - gridW) / 2
  const y0 = (canvasH - gridH) / 2

  // Minor lines, skipping positions that fall on a major line.
  const minor: Line[] = []
  for (let i = 1; i < cols * sub; i++) {
    if (i % sub === 0) continue
    const x = x0 + i * minorStep
    minor.push([x, y0, x, y0 + gridH])
  }
  for (let j = 1; j < rows * sub; j++) {
    if (j % sub === 0) continue
    const y = y0 + j * minorStep
    minor.push([x0, y, x0 + gridW, y])
  }

  // Major lines, interior only; the border is drawn separately.
  const majorLines: Line[] = []
  for (let c = 1; c < cols; c++) {
    const x = x0 + c * major
    majorLines.push([x, y0, x, y0 + gridH])
  }
  for (let r = 1; r < rows; r++) {
    const y = y0 + r * major
    majorLines.push([x0, y, x0 + gridW, y])
  }

  // Crosses at every major intersection, border included (clipped to the grid).
  const crosses: Point[] = []
  for (let c = 0; c <= cols; c++) {
    for (let r = 0; r <= rows; r++) crosses.push({ x: x0 + c * major, y: y0 + r * major })
  }

  return { x0, y0, cols, rows, gridW, gridH, minor, major: majorLines, crosses, arm: design.cross }
}

/* ------------------------------------------------------------------------ */
/* Sheet, layout B: rulers + dots + title block (make_blueprint_rulers.py)  */
/* ------------------------------------------------------------------------ */

export const RULER_STYLE = {
  frameInset: 12,
  frameWidth: 0.4,
  tickWidth: 0.25,
  dotRadius: 0.3,
  dotEdgeClear: 8,
  labelSize: 1.8,
  plusWidth: 0.6,
  font: 'Inter, \'Helvetica Neue\', Helvetica, Arial, sans-serif'
} as const

export const TITLE_BLOCK = {
  width: 72,
  height: 32,
  margin: 12,
  title: 'BLUEPRINT',
  subtitle: 'DESK REV. 01',
  footerLeft: 'SCALE 1:1 · DIMENSIONS IN MM',
  footerRight: 'SHEET 1 OF 1'
} as const

export interface TitleBlockGeometry {
  x: number
  y: number
  w: number
  h: number
  lines: Line[]
  labels: Label[]
}

export interface RulersSheetGeometry {
  x0: number
  y0: number
  w: number
  h: number
  ticks: Line[]
  labels: Label[]
  dots: Point[]
  crosses: Point[]
  /** Cross half-arm, mm. */
  arm: number
  titleBlock: TitleBlockGeometry | null
}

function cmTickLength(mm: number) {
  if (mm % 50 === 0) return 4.5
  if (mm % 10 === 0) return 3.0
  if (mm % 5 === 0) return 2.0
  return 1.2
}

/** k = number of 1/8 inches. */
function inchTickLength(k: number) {
  if (k % 8 === 0) return 3.0
  if (k % 4 === 0) return 2.0
  if (k % 2 === 0) return 1.5
  return 1.0
}

export function rulersSheetGeometry(canvasW: number, canvasH: number, bleed: number, design: BlueprintDesign): RulersSheetGeometry {
  const x0 = bleed + RULER_STYLE.frameInset
  const y0 = bleed + RULER_STYLE.frameInset
  const w = canvasW - 2 * x0
  const h = canvasH - 2 * y0
  const ticks: Line[] = []
  const labels: Label[] = []

  // Top ruler: cm, left → right
  for (let mm = 1; mm < w; mm++) {
    const x = x0 + mm
    ticks.push([x, y0, x, y0 + cmTickLength(mm)])
    if (mm % 10 === 0) labels.push({ x: x + 0.5, y: y0 + 3.2, text: String(mm / 10) })
  }
  labels.push({ x: x0 + 1, y: y0 + 3.2, text: 'cm', weight: 600 })

  // Left ruler: cm, top → bottom
  for (let mm = 1; mm < h; mm++) {
    const y = y0 + mm
    const L = cmTickLength(mm)
    ticks.push([x0, y, x0 + L, y])
    if (mm % 10 === 0) labels.push({ x: x0 + L + 0.6, y: y + 0.65, text: String(mm / 10) })
  }

  // Bottom ruler: inches, right → left
  for (let k = 1; k * MM_PER_INCH / 8 < w - 1; k++) {
    const x = x0 + w - k * MM_PER_INCH / 8
    ticks.push([x, y0 + h, x, y0 + h - inchTickLength(k)])
    if (k % 8 === 0) labels.push({ x: x - 0.5, y: y0 + h - 1.9, text: String(k / 8), anchor: 'end' })
  }
  labels.push({ x: x0 + w - 1, y: y0 + h - 3.6, text: 'inch', anchor: 'end', weight: 600 })

  // Right ruler: inches, bottom → top
  for (let k = 1; k * MM_PER_INCH / 8 < h - 1; k++) {
    const y = y0 + h - k * MM_PER_INCH / 8
    const L = inchTickLength(k)
    ticks.push([x0 + w, y, x0 + w - L, y])
    if (k % 8 === 0) labels.push({ x: x0 + w - L - 0.6, y: y + 0.65, text: String(k / 8), anchor: 'end' })
  }

  // Title block (top-right), only when the frame has room for it.
  const tb = TITLE_BLOCK
  const hasTitleBlock = w >= tb.width + 2 * tb.margin + 20 && h >= tb.height + 2 * tb.margin + 20
  const tbX = x0 + w - tb.margin - tb.width
  const tbY = y0 + tb.margin
  const inTitleBlock = (x: number, y: number) =>
    hasTitleBlock && x >= tbX - 3 && x <= tbX + tb.width + 3 && y >= tbY - 3 && y <= tbY + tb.height + 3

  // Dot grid at every minor step, skipping the ruler zone and the title block.
  const step = design.major / design.sub
  const maxX = x0 + w - RULER_STYLE.dotEdgeClear
  const maxY = y0 + h - RULER_STYLE.dotEdgeClear
  const dots: Point[] = []
  for (let i = 1; i <= Math.floor(w / step + EPS); i++) {
    const x = x0 + i * step
    if (x > maxX + EPS) continue
    for (let j = 1; j <= Math.floor(h / step + EPS); j++) {
      const y = y0 + j * step
      if (y > maxY + EPS || inTitleBlock(x, y)) continue
      dots.push({ x, y })
    }
  }

  // Crosses at major intersections, same zone rules as the dots.
  const crosses: Point[] = []
  for (let x = x0 + design.major; x <= maxX + EPS; x += design.major) {
    for (let y = y0 + design.major; y <= maxY + EPS; y += design.major) {
      if (!inTitleBlock(x, y)) crosses.push({ x, y })
    }
  }

  let titleBlock: TitleBlockGeometry | null = null
  if (hasTitleBlock) {
    const r1 = tbY + 11
    const r2 = r1 + 9
    const r3 = r2 + 8
    const mid = tbX + tb.width * 0.45
    titleBlock = {
      x: tbX,
      y: tbY,
      w: tb.width,
      h: tb.height,
      lines: [
        [tbX, r1, tbX + tb.width, r1],
        [tbX, r2, tbX + tb.width, r2],
        [tbX, r3, tbX + tb.width, r3],
        [mid, r2, mid, r3]
      ],
      labels: [
        { x: tbX + 2, y: tbY + 5.5, text: tb.title, size: 4, weight: 700 },
        { x: tbX + 2, y: tbY + 8.8, text: tb.subtitle, size: 1.6, weight: 500 },
        { x: tbX + 2, y: r1 + 2.4, text: 'PROJECT', size: 1.3, weight: 500 },
        { x: tbX + 2, y: r2 + 2.4, text: 'DATE', size: 1.3, weight: 500 },
        { x: mid + 2, y: r2 + 2.4, text: 'DRAWN BY', size: 1.3, weight: 500 },
        { x: tbX + 2, y: r3 + 2.6, text: tb.footerLeft, size: 1.2, weight: 500 },
        { x: tbX + tb.width - 2, y: r3 + 2.6, text: tb.footerRight, anchor: 'end', size: 1.2, weight: 500 }
      ]
    }
  }

  return { x0, y0, w, h, ticks, labels, dots, crosses, arm: design.cross * 0.7, titleBlock }
}
