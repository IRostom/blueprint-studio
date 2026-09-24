import type { BlueprintDesign } from './constants'
import type { Label, Line, Point } from './geometry'
import {
  GRID_STYLE,
  RULER_STYLE,
  gridSheetGeometry,
  rulersSheetGeometry,
  viewportGeometry
} from './geometry'

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
  const g = viewportGeometry(w, h, p, state)
  const id = (s: string) => `${idPrefix}-${s}`
  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(w)}" height="${fmt(h)}" viewBox="0 0 ${fmt(w)} ${fmt(h)}" aria-hidden="true">`
  ]

  // A 1px L-shape per tile draws one vertical and one horizontal line.
  const lTile = (s: number) => `M0 0H${fmt(s)}V1H1V${fmt(s)}H0Z`

  if (state.layout === 'grid') {
    out.push(
      '<defs>',
      `<pattern id="${id('minor')}" patternUnits="userSpaceOnUse" x="${fmt(g.mox)}" y="${fmt(g.moy)}" width="${fmt(g.m)}" height="${fmt(g.m)}">`,
      `<path d="${lTile(g.m)}" fill="${c.minor}" fill-opacity="${GRID_STYLE.minorOpacity}"/></pattern>`,
      `<pattern id="${id('major')}" patternUnits="userSpaceOnUse" x="${fmt(g.ox)}" y="${fmt(g.oy)}" width="${fmt(g.M)}" height="${fmt(g.M)}">`,
      `<path d="${lTile(g.M)}" fill="${c.major}"/></pattern>`,
      '</defs>',
      `<rect width="100%" height="100%" fill="${c.bg}"/>`,
      `<rect width="100%" height="100%" fill="url(#${id('minor')})"/>`,
      `<rect width="100%" height="100%" fill="url(#${id('major')})"/>`
    )
  } else {
    const r = g.dotRadius + 0.25
    out.push(
      '<defs>',
      `<pattern id="${id('dots')}" patternUnits="userSpaceOnUse" x="${fmt(g.mox - g.m / 2)}" y="${fmt(g.moy - g.m / 2)}" width="${fmt(g.m)}" height="${fmt(g.m)}">`,
      `<circle cx="${fmt(g.m / 2)}" cy="${fmt(g.m / 2)}" r="${fmt(r)}" fill="${c.minor}"/></pattern>`,
      '</defs>',
      `<rect width="100%" height="100%" fill="${c.bg}"/>`,
      `<rect width="100%" height="100%" fill="url(#${id('dots')})"/>`
    )
  }

  // Crosses: two filled bars each, like the prototype's gradients.
  if (g.crosses.length) {
    const a = g.arm
    const t = g.thickness
    const d = g.crosses.map(({ x, y }) =>
      `M${fmt(x - a / 2)} ${fmt(y - t / 2)}h${fmt(a)}v${fmt(t)}h${fmt(-a)}z`
      + `M${fmt(x - t / 2)} ${fmt(y - a / 2)}h${fmt(t)}v${fmt(a)}h${fmt(-t)}z`).join('')
    out.push(`<path d="${d}" fill="${c.plus}"/>`)
  }

  // Rulers: 1px tick strips on all four window edges (major 14px, minor 7px).
  if (state.layout === 'rulers' && g.m >= 2) {
    const L = 14
    const isMajor = (pos: number, origin: number) => {
      const k = (pos - origin) / g.M
      return Math.abs(k - Math.round(k)) < 1e-3
    }
    const d: string[] = []
    for (let x = g.mox; x <= w; x += g.m) {
      const len = isMajor(x, g.ox) ? L : L / 2
      d.push(`M${fmt(x)} 0h1v${len}h-1z`, `M${fmt(x)} ${fmt(h)}h1v${-len}h-1z`)
    }
    for (let y = g.moy; y <= h; y += g.m) {
      const len = isMajor(y, g.oy) ? L : L / 2
      d.push(`M0 ${fmt(y)}v1h${len}v-1z`, `M${fmt(w)} ${fmt(y)}v1h${-len}v-1z`)
    }
    out.push(`<path d="${d.join('')}" fill="${c.plus}"/>`)
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
  const sw = (mm: number) => fmt(Math.max(mm, minStrokePx / p))
  const size = unit === 'mm'
    ? `width="${fmt(W)}mm" height="${fmt(H)}mm"`
    : `width="${fmt(W * p)}" height="${fmt(H * p)}"`
  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" ${size} viewBox="0 0 ${fmt(W)} ${fmt(H)}">`
  ]

  if (state.layout === 'grid') {
    const g = gridSheetGeometry(W, H, bleed, state)
    const bw = GRID_STYLE.borderWidth
    const clipId = `${idPrefix}-grid-clip`
    out.push(
      '<defs>',
      `<clipPath id="${clipId}"><rect x="${fmt(g.x0 - bw / 2)}" y="${fmt(g.y0 - bw / 2)}" width="${fmt(g.gridW + bw)}" height="${fmt(g.gridH + bw)}"/></clipPath>`,
      '</defs>',
      `<rect id="background" width="${fmt(W)}" height="${fmt(H)}" fill="${c.bg}"/>`,
      `<g id="minor-grid" stroke="${c.minor}" stroke-width="${sw(GRID_STYLE.minorWidth)}" stroke-opacity="${GRID_STYLE.minorOpacity}">${g.minor.map(lineEl).join('')}</g>`,
      `<g id="major-grid" stroke="${c.major}" stroke-width="${sw(GRID_STYLE.majorWidth)}">${g.major.map(lineEl).join('')}</g>`,
      `<g id="border" stroke="${c.major}" stroke-width="${sw(bw)}" fill="none" stroke-linecap="square"><rect x="${fmt(g.x0)}" y="${fmt(g.y0)}" width="${fmt(g.gridW)}" height="${fmt(g.gridH)}"/></g>`,
      `<g id="plus-signs" clip-path="url(#${clipId})" stroke="${c.plus}" stroke-width="${sw(GRID_STYLE.plusWidth)}" stroke-linecap="square">${crossLines(g.crosses, g.arm)}</g>`
    )
  } else {
    const g = rulersSheetGeometry(W, H, bleed, state)
    const dotD = g.dots.map(({ x, y }) => `M${fmt(x)} ${fmt(y)}h0`).join('')
    out.push(
      `<rect id="background" width="${fmt(W)}" height="${fmt(H)}" fill="${c.bg}"/>`,
      // Zero-length round-capped segments: one element for thousands of dots.
      `<path id="dots" d="${dotD}" stroke="${c.minor}" stroke-width="${sw(RULER_STYLE.dotRadius * 2)}" stroke-linecap="round" fill="none"/>`,
      `<g id="plus-signs" stroke="${c.plus}" stroke-width="${sw(RULER_STYLE.plusWidth)}" stroke-linecap="square">${crossLines(g.crosses, g.arm)}</g>`,
      `<rect id="frame" x="${fmt(g.x0)}" y="${fmt(g.y0)}" width="${fmt(g.w)}" height="${fmt(g.h)}" fill="none" stroke="${c.major}" stroke-width="${sw(RULER_STYLE.frameWidth)}"/>`,
      `<g id="ruler-ticks" stroke="${c.plus}" stroke-width="${sw(RULER_STYLE.tickWidth)}">${g.ticks.map(lineEl).join('')}</g>`,
      `<g id="ruler-labels" fill="${c.plus}" font-family="${esc(RULER_STYLE.font)}">${g.labels.map(textEl).join('')}</g>`
    )
    const tb = g.titleBlock
    if (tb) {
      out.push(
        `<g id="title-block" fill="${c.plus}" font-family="${esc(RULER_STYLE.font)}">`,
        `<rect x="${fmt(tb.x)}" y="${fmt(tb.y)}" width="${fmt(tb.w)}" height="${fmt(tb.h)}" fill="${c.bg}"/>`,
        `<g stroke="${c.plus}" stroke-width="${sw(0.3)}" fill="none">`,
        `<rect x="${fmt(tb.x)}" y="${fmt(tb.y)}" width="${fmt(tb.w)}" height="${fmt(tb.h)}"/>`,
        tb.lines.map(lineEl).join(''),
        '</g>',
        tb.labels.map(textEl).join(''),
        '</g>'
      )
    }
  }

  out.push('</svg>')
  return out.join('')
}
