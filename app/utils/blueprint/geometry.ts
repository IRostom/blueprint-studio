import type { BlueprintDesign, RulerSide, RulerUnits } from './constants'
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
  /** Line thickness, px. */
  minorWidth: number
  majorWidth: number
  /** Minor dot radius, px (major dots are twice as big). */
  dotRadius: number
}

/** Ruler strip length on screen, px (minor ticks are half). */
export const VIEWPORT_RULER_PX = 14

export function viewportGeometry(w: number, h: number, p: number, design: BlueprintDesign): ViewportGeometry {
  const M = design.major * p
  const m = M / design.sub
  const ox = mod(w / 2, M)
  const oy = mod(h / 2, M)
  const mox = mod(w / 2, m)
  const moy = mod(h / 2, m)
  const { style } = design
  const wt = style.weights
  const arm = Math.max(5, design.cross * 2 * p)
  const px = (mm: number, max: number) => Math.min(max, Math.max(1, mm * p))
  const thickness = px(wt.cross, 3)
  // Screen dots stay visible at any zoom; the weight scales them relative to the default 0.3 mm.
  const dotRadius = Math.max(0.6, Math.min(1.4, m * 0.06)) * (wt.dot / 0.3)

  // Crosses keep clear of the window edges that carry a ruler.
  const sides = style.rulers ? style.rulerSides : []
  const clear = style.rulerClear * p
  const keep = (x: number, y: number) =>
    !(sides.includes('left') && x < clear) && !(sides.includes('right') && w - x < clear)
    && !(sides.includes('top') && y < clear) && !(sides.includes('bottom') && h - y < clear)

  const crosses: Point[] = []
  if (style.crosses && M >= 8) {
    for (let x = ox; x <= w + 0.5; x += M) {
      for (let y = oy; y <= h + 0.5; y += M) {
        if (keep(x, y)) crosses.push({ x, y })
      }
    }
  }

  return {
    M, m, ox, oy, mox, moy, crosses, arm, thickness,
    minorWidth: px(wt.minor, 3), majorWidth: px(wt.major, 4), dotRadius
  }
}

/* ------------------------------------------------------------------------ */
/* Sheet: a bounded frame with the layers the style turns on. Units: mm.    */
/* The `grid` preset reproduces make_blueprint.py and the `rulers` preset   */
/* make_blueprint_rulers.py.                                                */
/* ------------------------------------------------------------------------ */

/** Fixed ruler / title block styling (weights and margins live in the style). */
export const RULER_STYLE = {
  tickWidth: 0.25,
  labelSize: 1.8,
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

export interface SheetGeometry {
  /** Frame (grid border) in mm. */
  x0: number
  y0: number
  w: number
  h: number
  /** Whole major cells across / down the frame. */
  cols: number
  rows: number
  minor: Line[]
  major: Line[]
  minorDots: Point[]
  majorDots: Point[]
  crosses: Point[]
  /** Cross half-arm, mm. */
  arm: number
  ticks: Line[]
  labels: Label[]
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

interface Frame { x0: number, y0: number, w: number, h: number }

/** Unit per side, and whether it is measured from the far end (bottom → top, right → left). */
function rulerSpec(side: RulerSide, units: RulerUnits): { unit: 'cm' | 'inch', reverse: boolean } {
  if (units !== 'mixed') return { unit: units, reverse: false }
  return side === 'top' || side === 'left'
    ? { unit: 'cm', reverse: false }
    : { unit: 'inch', reverse: true }
}

/** Ticks and number labels for one ruler side. */
function rulerSide(side: RulerSide, units: RulerUnits, f: Frame, ticks: Line[], labels: Label[]) {
  const { unit, reverse } = rulerSpec(side, units)
  const horizontal = side === 'top' || side === 'bottom'
  const len = horizontal ? f.w : f.h
  const start = horizontal ? f.x0 : f.y0
  const marks: { d: number, L: number, text?: string }[] = []
  if (unit === 'cm') {
    for (let mm = 1; mm < len; mm++) {
      marks.push({ d: mm, L: cmTickLength(mm), text: mm % 10 === 0 ? String(mm / 10) : undefined })
    }
  } else {
    for (let k = 1; k * MM_PER_INCH / 8 < len - 1; k++) {
      marks.push({ d: k * MM_PER_INCH / 8, L: inchTickLength(k), text: k % 8 === 0 ? String(k / 8) : undefined })
    }
  }
  const right = f.x0 + f.w
  const bottom = f.y0 + f.h
  for (const { d, L, text } of marks) {
    const p = reverse ? start + len - d : start + d
    if (side === 'top') ticks.push([p, f.y0, p, f.y0 + L])
    else if (side === 'bottom') ticks.push([p, bottom, p, bottom - L])
    else if (side === 'left') ticks.push([f.x0, p, f.x0 + L, p])
    else ticks.push([right, p, right - L, p])
    if (!text) continue
    if (horizontal) {
      const y = side === 'top' ? f.y0 + 3.2 : bottom - 1.9
      labels.push(reverse ? { x: p - 0.5, y, text, anchor: 'end' } : { x: p + 0.5, y, text })
    } else {
      labels.push(side === 'left'
        ? { x: f.x0 + L + 0.6, y: p + 0.65, text }
        : { x: right - L - 0.6, y: p + 0.65, text, anchor: 'end' })
    }
  }
}

/** The "cm" / "inch" label, at the start of the first ruler (horizontal first) using that unit. */
function unitLabel(unit: 'cm' | 'inch', sides: RulerSide[], units: RulerUnits, f: Frame): Label | null {
  const order: RulerSide[] = ['top', 'bottom', 'left', 'right']
  const side = order.find(s => sides.includes(s) && rulerSpec(s, units).unit === unit)
  if (!side) return null
  const { reverse } = rulerSpec(side, units)
  const right = f.x0 + f.w
  const bottom = f.y0 + f.h
  const base = { text: unit, weight: 600 }
  switch (side) {
    case 'top':
      return { ...base, x: f.x0 + 1, y: f.y0 + 3.2 }
    case 'bottom':
      return reverse
        ? { ...base, x: right - 1, y: bottom - 3.6, anchor: 'end' }
        : { ...base, x: f.x0 + 1, y: bottom - 3.6 }
    case 'left':
      return { ...base, x: f.x0 + 5, y: f.y0 + 3.2 }
    case 'right':
      return reverse
        ? { ...base, x: right - 5, y: bottom - 1.9, anchor: 'end' }
        : { ...base, x: right - 5, y: f.y0 + 3.2, anchor: 'end' }
  }
}

function titleBlockGeometry(tbX: number, tbY: number): TitleBlockGeometry {
  const tb = TITLE_BLOCK
  const r1 = tbY + 11
  const r2 = r1 + 9
  const r3 = r2 + 8
  const mid = tbX + tb.width * 0.45
  return {
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

export function sheetGeometry(canvasW: number, canvasH: number, bleed: number, design: BlueprintDesign): SheetGeometry {
  const { major, sub, style } = design
  const step = major / sub

  // Frame: whole major cells inside the margin, or the margin itself.
  const inner = (size: number) => size - 2 * (bleed + style.margin)
  const fit = (size: number) => style.fit === 'cells'
    ? Math.max(1, Math.floor(inner(size) / major + EPS)) * major
    : Math.max(major, inner(size))
  const w = fit(canvasW)
  const h = fit(canvasH)
  const x0 = (canvasW - w) / 2
  const y0 = (canvasH - h) / 2
  const f: Frame = { x0, y0, w, h }
  const cols = Math.floor(w / major + EPS)
  const rows = Math.floor(h / major + EPS)
  const right = x0 + w
  const bottom = y0 + h

  // Title block (top-right), only when the frame has room for it.
  const tb = TITLE_BLOCK
  const hasTitleBlock = style.titleBlock
    && w >= tb.width + 2 * tb.margin + 20 && h >= tb.height + 2 * tb.margin + 20
  const tbX = right - tb.margin - tb.width
  const tbY = y0 + tb.margin
  const inTitleBlock = (x: number, y: number) =>
    hasTitleBlock && x >= tbX - 3 && x <= tbX + tb.width + 3 && y >= tbY - 3 && y <= tbY + tb.height + 3

  // Points keep clear of ruler sides and the title block; edge points are opt-in.
  const sides = style.rulers ? style.rulerSides : []
  const clear = (s: RulerSide) => sides.includes(s) ? style.rulerClear : 0
  const keep = (x: number, y: number, edges: boolean) => {
    const dl = x - x0
    const dr = right - x
    const dt = y - y0
    const db = bottom - y
    if (!edges && Math.min(dl, dr, dt, db) < EPS) return false
    if (dl < clear('left') - EPS || dr < clear('right') - EPS) return false
    if (dt < clear('top') - EPS || db < clear('bottom') - EPS) return false
    return !inTitleBlock(x, y)
  }

  // Lattice counts along each axis at a given step.
  const nx = (s: number) => Math.floor(w / s + EPS)
  const ny = (s: number) => Math.floor(h / s + EPS)

  // Major lines, interior only; the border is drawn separately.
  const majorLines: Line[] = []
  if (style.majorStyle === 'lines') {
    for (let c = 1; c * major < w - EPS; c++) majorLines.push([x0 + c * major, y0, x0 + c * major, bottom])
    for (let r = 1; r * major < h - EPS; r++) majorLines.push([x0, y0 + r * major, right, y0 + r * major])
  }

  // Minor lines, skipping positions a major line already covers.
  const onMajor = (i: number) => style.majorStyle === 'lines' && i % sub === 0
  const minor: Line[] = []
  if (style.minorStyle === 'lines') {
    for (let i = 1; i * step < w - EPS; i++) {
      if (!onMajor(i)) minor.push([x0 + i * step, y0, x0 + i * step, bottom])
    }
    for (let j = 1; j * step < h - EPS; j++) {
      if (!onMajor(j)) minor.push([x0, y0 + j * step, right, y0 + j * step])
    }
  }

  // Dots sit on the frame edge only when there is no border to draw it.
  const majorDots: Point[] = []
  if (style.majorStyle === 'dots') {
    for (let c = 0; c <= nx(major); c++) {
      for (let r = 0; r <= ny(major); r++) {
        const x = x0 + c * major
        const y = y0 + r * major
        if (keep(x, y, !style.border)) majorDots.push({ x, y })
      }
    }
  }
  const minorDots: Point[] = []
  if (style.minorStyle === 'dots') {
    for (let i = 0; i <= nx(step); i++) {
      for (let j = 0; j <= ny(step); j++) {
        if (style.majorStyle === 'dots' && i % sub === 0 && j % sub === 0) continue
        if (onMajor(i) || onMajor(j)) continue
        const x = x0 + i * step
        const y = y0 + j * step
        if (keep(x, y, !style.border)) minorDots.push({ x, y })
      }
    }
  }

  // Crosses at major intersections (clipped to the border when on its edge).
  const crosses: Point[] = []
  if (style.crosses) {
    for (let c = 0; c <= cols; c++) {
      for (let r = 0; r <= rows; r++) {
        const x = x0 + c * major
        const y = y0 + r * major
        if (keep(x, y, style.edgeCrosses)) crosses.push({ x, y })
      }
    }
  }

  // Rulers
  const ticks: Line[] = []
  const labels: Label[] = []
  for (const side of sides) rulerSide(side, style.rulerUnits, f, ticks, labels)
  for (const unit of ['cm', 'inch'] as const) {
    const l = unitLabel(unit, sides, style.rulerUnits, f)
    if (l) labels.push(l)
  }

  return {
    x0, y0, w, h, cols, rows,
    minor, major: majorLines, minorDots, majorDots, crosses, arm: design.cross,
    ticks, labels,
    titleBlock: hasTitleBlock ? titleBlockGeometry(tbX, tbY) : null
  }
}
