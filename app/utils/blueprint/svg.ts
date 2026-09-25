import type { BlueprintDesign } from './constants'
import type { Label, Line, Point } from './geometry'
import { RULER_STYLE, VIEWPORT_RULER_PX, sheetGeometry, viewportGeometry } from './geometry'

export interface BuildBlueprintSvgOptions {
  /**
   * `viewport`: unbounded field centred on the box (the full-window background).
   * `sheet`: a finished print/screen file, geometry from the Python generators.
   */
  mode: 'viewport' | 'sheet'
  /** Box size in mm. For a sheet this is the whole canvas, bleed included. */
  widthUnits: number
  heightUnits: number
  /** Output px per mm. */
  pxPerUnit: number
  state: BlueprintDesign
  /** Sheet only: bleed in mm on every side. */
  bleed?: number
  /** Sheet only: `mm` writes width="{W}mm" (print files); `px` writes pixel dimensions. */
  unit?: 'mm' | 'px'
  /** Sheet only: never draw a stroke thinner than this many output px (small previews). */
  minStrokePx?: number
  /** Prefix for ids, so several SVGs can share one document. */
  idPrefix?: string
}

/** Number formatting like Python's `:g` for our ranges: at most 3 decimals, no trailing zeros. */
export const fmt = (v: number) => String(Number(v.toFixed(3)))

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const lineEl = ([x1, y1, x2, y2]: Line) =>
  `<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}"/>`

function textEl(l: Label) {
  return `<text x="${fmt(l.x)}" y="${fmt(l.y)}" text-anchor="${l.anchor ?? 'start'}" font-size="${fmt(l.size ?? RULER_STYLE.labelSize)}" font-weight="${l.weight ?? 400}">${esc(l.text)}</text>`
}

/** Two lines per cross, half-arm `arm`. */
const crossLines = (points: Point[], arm: number) =>
  points.map(({ x, y }) => lineEl([x - arm, y, x + arm, y]) + lineEl([x, y - arm, x, y + arm])).join('')

export function buildBlueprintSvg(opts: BuildBlueprintSvgOptions): string {
  return opts.mode === 'viewport' ? buildViewport(opts) : buildSheet(opts)
}

/* ------------------------------------------------------------------------ */

function buildViewport({ widthUnits, heightUnits, pxPerUnit: p, state, idPrefix = 'bp-vp' }: BuildBlueprintSvgOptions) {
  const w = widthUnits * p
  const h = heightUnits * p
  const c = state.colors
  const st = state.style
  const g = viewportGeometry(w, h, p, state)
  const id = (s: string) => `${idPrefix}-${s}`
  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(w)}" height="${fmt(h)}" viewBox="0 0 ${fmt(w)} ${fmt(h)}" aria-hidden="true">`
  ]

  // A t-px L-shape per tile draws one vertical and one horizontal line.
  const lTile = (s: number, t: number) => `M0 0H${fmt(s)}V${fmt(t)}H${fmt(t)}V${fmt(s)}H0Z`
  // Dot patterns are offset half a tile so the dot sits on the lattice point.
  const dotTile = (s: number, r: number, fill: string) =>
    `<circle cx="${fmt(s / 2)}" cy="${fmt(s / 2)}" r="${fmt(r)}" fill="${fill}"/>`

  const defs: string[] = []
  const fills: string[] = []
  const layer = (name: string, x: number, y: number, s: number, body: string) => {
    defs.push(`<pattern id="${id(name)}" patternUnits="userSpaceOnUse" x="${fmt(x)}" y="${fmt(y)}" width="${fmt(s)}" height="${fmt(s)}">${body}</pattern>`)
    fills.push(`<rect width="100%" height="100%" fill="url(#${id(name)})"/>`)
  }

  if (st.minorStyle === 'lines') {
    layer('minor', g.mox, g.moy, g.m, `<path d="${lTile(g.m, g.minorWidth)}" fill="${c.minor}" fill-opacity="${fmt(st.weights.minorOpacity)}"/>`)
  } else if (st.minorStyle === 'dots') {
    layer('dots', g.mox - g.m / 2, g.moy - g.m / 2, g.m, dotTile(g.m, g.dotRadius + 0.25, c.minor))
  }
  if (st.majorStyle === 'lines') {
    layer('major', g.ox, g.oy, g.M, `<path d="${lTile(g.M, g.majorWidth)}" fill="${c.major}"/>`)
  } else if (st.majorStyle === 'dots') {
    layer('major-dots', g.ox - g.M / 2, g.oy - g.M / 2, g.M, dotTile(g.M, g.dotRadius * 2 + 0.25, c.major))
  }

  if (defs.length) out.push('<defs>', ...defs, '</defs>')
  out.push(`<rect width="100%" height="100%" fill="${c.bg}"/>`, ...fills)

  // Crosses: two filled bars each, like the prototype's gradients.
  if (g.crosses.length) {
    const a = g.arm
    const t = g.thickness
    const d = g.crosses.map(({ x, y }) =>
      `M${fmt(x - a / 2)} ${fmt(y - t / 2)}h${fmt(a)}v${fmt(t)}h${fmt(-a)}z`
      + `M${fmt(x - t / 2)} ${fmt(y - a / 2)}h${fmt(t)}v${fmt(a)}h${fmt(-t)}z`).join('')
    out.push(`<path d="${d}" fill="${c.plus}"/>`)
  }

  // Rulers: 1px tick strips on the chosen window edges (major full length, minor half).
  const sides = st.rulers ? st.rulerSides : []
  if (sides.length && g.m >= 2) {
    const L = VIEWPORT_RULER_PX
    const isMajor = (pos: number, origin: number) => {
      const k = (pos - origin) / g.M
      return Math.abs(k - Math.round(k)) < 1e-3
    }
    const d: string[] = []
    for (let x = g.mox; x <= w; x += g.m) {
      const len = isMajor(x, g.ox) ? L : L / 2
      if (sides.includes('top')) d.push(`M${fmt(x)} 0h1v${len}h-1z`)
      if (sides.includes('bottom')) d.push(`M${fmt(x)} ${fmt(h)}h1v${-len}h-1z`)
    }
    for (let y = g.moy; y <= h; y += g.m) {
      const len = isMajor(y, g.oy) ? L : L / 2
      if (sides.includes('left')) d.push(`M0 ${fmt(y)}v1h${len}v-1z`)
      if (sides.includes('right')) d.push(`M${fmt(w)} ${fmt(y)}v1h${-len}v-1z`)
    }
    out.push(`<path id="${id('rulers')}" d="${d.join('')}" fill="${c.ruler}"/>`)
  }

  out.push('</svg>')
  return out.join('')
}

/* ------------------------------------------------------------------------ */

function buildSheet({
  widthUnits: W,
  heightUnits: H,
  pxPerUnit: p,
  state,
  bleed = 0,
  unit = 'px',
  minStrokePx = 0,
  idPrefix = 'bp'
}: BuildBlueprintSvgOptions) {
  const c = state.colors
  const st = state.style
  const wt = st.weights
  const sw = (mm: number) => fmt(Math.max(mm, minStrokePx / p))
  const size = unit === 'mm'
    ? `width="${fmt(W)}mm" height="${fmt(H)}mm"`
    : `width="${fmt(W * p)}" height="${fmt(H * p)}"`
  const g = sheetGeometry(W, H, bleed, state)
  const bw = st.border ? wt.border : 0
  const clipId = `${idPrefix}-grid-clip`
  // Zero-length round-capped segments: one element for thousands of dots.
  const dotPath = (pts: typeof g.minorDots) => pts.map(({ x, y }) => `M${fmt(x)} ${fmt(y)}h0`).join('')

  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" ${size} viewBox="0 0 ${fmt(W)} ${fmt(H)}">`,
    '<defs>',
    `<clipPath id="${clipId}"><rect x="${fmt(g.x0 - bw / 2)}" y="${fmt(g.y0 - bw / 2)}" width="${fmt(g.w + bw)}" height="${fmt(g.h + bw)}"/></clipPath>`,
    '</defs>',
    `<rect id="background" width="${fmt(W)}" height="${fmt(H)}" fill="${c.bg}"/>`
  ]
  if (g.minor.length) {
    out.push(`<g id="minor-grid" stroke="${c.minor}" stroke-width="${sw(wt.minor)}" stroke-opacity="${fmt(wt.minorOpacity)}">${g.minor.map(lineEl).join('')}</g>`)
  }
  if (g.minorDots.length) {
    out.push(`<path id="dots" d="${dotPath(g.minorDots)}" stroke="${c.minor}" stroke-width="${sw(wt.dot * 2)}" stroke-linecap="round" fill="none"/>`)
  }
  if (g.major.length) {
    out.push(`<g id="major-grid" stroke="${c.major}" stroke-width="${sw(wt.major)}">${g.major.map(lineEl).join('')}</g>`)
  }
  if (g.majorDots.length) {
    out.push(`<path id="major-dots" d="${dotPath(g.majorDots)}" stroke="${c.major}" stroke-width="${sw(wt.dot * 4)}" stroke-linecap="round" fill="none"/>`)
  }
  if (st.border) {
    out.push(`<g id="border" stroke="${c.major}" stroke-width="${sw(bw)}" fill="none" stroke-linecap="square"><rect x="${fmt(g.x0)}" y="${fmt(g.y0)}" width="${fmt(g.w)}" height="${fmt(g.h)}"/></g>`)
  }
  if (g.crosses.length) {
    out.push(`<g id="plus-signs" clip-path="url(#${clipId})" stroke="${c.plus}" stroke-width="${sw(wt.cross)}" stroke-linecap="square">${crossLines(g.crosses, g.arm)}</g>`)
  }
  if (g.ticks.length) {
    out.push(
      `<g id="ruler-ticks" stroke="${c.ruler}" stroke-width="${sw(RULER_STYLE.tickWidth)}">${g.ticks.map(lineEl).join('')}</g>`,
      `<g id="ruler-labels" fill="${c.ruler}" font-family="${esc(RULER_STYLE.font)}">${g.labels.map(textEl).join('')}</g>`
    )
  }
  const tb = g.titleBlock
  if (tb) {
    out.push(
      `<g id="title-block" fill="${c.ruler}" font-family="${esc(RULER_STYLE.font)}">`,
      `<rect x="${fmt(tb.x)}" y="${fmt(tb.y)}" width="${fmt(tb.w)}" height="${fmt(tb.h)}" fill="${c.bg}"/>`,
      `<g stroke="${c.ruler}" stroke-width="${sw(0.3)}" fill="none">`,
      `<rect x="${fmt(tb.x)}" y="${fmt(tb.y)}" width="${fmt(tb.w)}" height="${fmt(tb.h)}"/>`,
      tb.lines.map(lineEl).join(''),
      '</g>',
      tb.labels.map(textEl).join(''),
      '</g>'
    )
  }

  out.push('</svg>')
  return out.join('')
}
