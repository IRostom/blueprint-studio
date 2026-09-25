import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { BlueprintDesign, ExportSettings, GridStyle } from '../app/utils/blueprint/constants'
import { DEFAULT_DESIGN, DEFAULT_EXPORT, STYLE_PRESETS } from '../app/utils/blueprint/constants'
import { sheetGeometry, viewportGeometry } from '../app/utils/blueprint/geometry'
import { buildBlueprintSvg } from '../app/utils/blueprint/svg'
import { canvasUnits, exceedsCanvasLimit, exportFilename, exportSvg, outputLabel, pngPixels } from '../app/utils/blueprint/export'
import { matchStylePreset, normalizeStyle, presetDesign } from '../app/utils/blueprint/style'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

/** Inner markup of `<g id="…">`, up to its first closing tag. */
function group(svg: string, id: string) {
  const m = svg.match(new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</g>`))
  if (!m) throw new Error(`group ${id} not found`)
  return m[1]!
}

/** Every <line> as a sorted list of rounded coordinate tuples. */
function lines(markup: string) {
  return [...markup.matchAll(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"\/>/g)]
    .map(m => m.slice(1, 5).map(v => Number(Number(v).toFixed(3))).join(','))
    .sort()
}

function texts(markup: string) {
  return [...markup.matchAll(/<text x="([^"]+)" y="([^"]+)"[^>]*>([^<]*)<\/text>/g)]
    .map(m => `${Number(m[1]).toFixed(3)},${Number(m[2]).toFixed(3)},${m[3]}`)
    .sort()
}

const printMat: ExportSettings = { ...DEFAULT_EXPORT }

/** A preset's design with some style fields changed. */
const styled = (id: string, style: Partial<GridStyle>, rest: Partial<BlueprintDesign> = {}) => {
  const d = presetDesign(id, rest)
  return { ...d, style: { ...d.style, ...style } }
}

describe('grid sheet matches make_blueprint.py', () => {
  // make_blueprint.py: 940×440 canvas, 50/10 mm, half-arm 3 mm.
  const design = presetDesign('grid', { cross: 3 })
  const ours = exportSvg(design, printMat)
  const ref = fixture('blueprint-deskmat.svg')

  it('fits 16 × 6 major cells', () => {
    const g = sheetGeometry(940, 440, 20, design)
    expect([g.cols, g.rows, g.x0, g.y0]).toEqual([16, 6, 70, 70])
    expect(g.crosses).toHaveLength(17 * 7)
  })

  it.each(['minor-grid', 'major-grid', 'plus-signs'])('%s lines are identical', (id) => {
    expect(lines(group(ours, id))).toEqual(lines(group(ref, id)))
  })

  it('writes print dimensions in mm', () => {
    expect(ours).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="940mm" height="440mm" viewBox="0 0 940 440">/)
  })

  it('clips crosses to the border', () => {
    expect(ours).toContain('<rect x="69.7" y="69.7" width="800.6" height="300.6"/>')
  })
})

describe('rulers sheet matches make_blueprint_rulers.py', () => {
  const design = presetDesign('rulers')
  const ours = exportSvg(design, printMat)
  const ref = fixture('blueprint-deskmat-rulers.svg')

  it('ruler ticks are identical', () => {
    expect(lines(group(ours, 'ruler-ticks'))).toEqual(lines(group(ref, 'ruler-ticks')))
    expect(lines(group(ours, 'ruler-ticks'))).toHaveLength(1643)
  })

  it('ruler labels are identical', () => {
    expect(texts(group(ours, 'ruler-labels'))).toEqual(texts(group(ref, 'ruler-labels')))
  })

  it('dots sit at the same positions', () => {
    const refDots = [...group(ref, 'dots').matchAll(/cx="([^"]+)" cy="([^"]+)"/g)].map(m => `${Number(m[1])},${Number(m[2])}`).sort()
    const d = ours.match(/<path id="dots" d="([^"]+)"/)![1]!
    const ourDots = [...d.matchAll(/M([\d.]+) ([\d.]+)h0/g)].map(m => `${Number(m[1])},${Number(m[2])}`).sort()
    expect(ourDots).toHaveLength(3064)
    expect(ourDots).toEqual(refDots)
  })

  it('title block has the same text', () => {
    const tb = (svg: string) => texts(svg.slice(svg.indexOf('id="title-block"')))
    expect(tb(ours)).toEqual(tb(ref))
  })

  it('drops the title block when the frame is too small', () => {
    expect(sheetGeometry(100, 80, 0, design).titleBlock).toBeNull()
  })
})

describe('composable styles', () => {
  const W = 940
  const H = 440
  const B = 20
  const svgOf = (d: BlueprintDesign) => exportSvg(d, printMat)

  it('presets match themselves and edits become custom', () => {
    for (const p of STYLE_PRESETS) expect(matchStylePreset(presetDesign(p.id))).toBe(p.id)
    expect(matchStylePreset(styled('grid', { border: false }))).toBe('custom')
    expect(matchStylePreset(presetDesign('grid', { cross: 5 }))).toBe('custom')
    expect(exportFilename(presetDesign('rulers'), printMat)).toMatch(/^blueprint-rulers-/)
  })

  it('drops edge crosses when asked', () => {
    expect(sheetGeometry(W, H, B, styled('grid', { edgeCrosses: false })).crosses).toHaveLength(15 * 5)
  })

  it('keeps crosses clear of a ruler side only', () => {
    const g = sheetGeometry(W, H, B, styled('grid', { rulers: true, rulerSides: ['bottom'] }))
    const bottom = g.y0 + g.h
    expect(g.crosses.every(p => bottom - p.y >= 8)).toBe(true)
    // Top edge crosses stay: no ruler there.
    expect(g.crosses.some(p => p.y === g.y0)).toBe(true)
    expect(g.ticks.every(([, y1]) => y1 === bottom)).toBe(true)
  })

  it('rulerClear 0 keeps points next to ruler sides', () => {
    const g = sheetGeometry(W, H, B, styled('grid', { rulers: true, rulerSides: ['bottom'], rulerClear: 0 }))
    expect(g.crosses).toHaveLength(17 * 7)
  })

  it('single-unit rulers use that unit on every side', () => {
    const g = sheetGeometry(W, H, B, styled('rulers', { rulerUnits: 'cm', rulerSides: ['bottom'] }))
    const texts = g.labels.map(l => l.text)
    expect(texts).toContain('cm')
    expect(texts).not.toContain('inch')
    // 1 mm ticks along the bottom.
    expect(g.ticks).toHaveLength(Math.ceil(g.w) - 1)
  })

  it('major dots replace major lines', () => {
    const svg = svgOf(styled('grid', { majorStyle: 'dots' }))
    expect(svg).toContain('id="major-dots"')
    expect(svg).not.toContain('id="major-grid"')
  })

  it('minor lines cover major positions when majors are off', () => {
    const g = sheetGeometry(W, H, B, styled('grid', { majorStyle: 'none' }))
    expect(g.minor).toHaveLength(16 * 5 - 1 + 6 * 5 - 1)
  })

  it('minor dots skip major dot positions', () => {
    const g = sheetGeometry(W, H, B, styled('dots', {}))
    const key = (p: { x: number, y: number }) => `${p.x},${p.y}`
    const majors = new Set(g.majorDots.map(key))
    expect(g.majorDots.length).toBeGreaterThan(0)
    expect(g.minorDots.some(p => majors.has(key(p)))).toBe(false)
  })

  it('all layers off leaves only the background', () => {
    const svg = svgOf(styled('grid', { majorStyle: 'none', minorStyle: 'none', crosses: false, border: false }))
    expect(svg).not.toMatch(/<(line|path|text)/)
    expect(svg).toContain('id="background"')
  })

  it('margin moves the frame', () => {
    const g = sheetGeometry(W, H, B, styled('grid', { margin: 20 }))
    expect([g.cols, g.rows]).toEqual([17, 7])
    const s = sheetGeometry(W, H, B, styled('rulers', { margin: 30 }))
    expect([s.x0, s.w]).toEqual([50, 840])
  })

  it('weights reach the markup', () => {
    const d = styled('grid', {})
    d.style.weights = { ...d.style.weights, minor: 0.45, minorOpacity: 0.5, cross: 1.2 }
    const svg = svgOf(d)
    expect(svg).toContain('id="minor-grid" stroke="#9cc8ff" stroke-width="0.45" stroke-opacity="0.5"')
    expect(svg).toMatch(/id="plus-signs"[^>]*stroke-width="1.2"/)
  })

  it('normalizes persisted styles', () => {
    expect(normalizeStyle({ ...presetDesign('grid').style, margin: 500 })?.margin).toBe(100)
    expect(normalizeStyle({ ...presetDesign('grid').style, rulerSides: ['left', 'top', 'x'] })?.rulerSides).toEqual(['top', 'left'])
    expect(normalizeStyle({ ...presetDesign('grid').style, majorStyle: '<script>' })).toBeNull()
    expect(normalizeStyle({ ...presetDesign('grid').style, margin: Number.NaN })).toBeNull()
  })

  it('viewport draws rulers only on chosen sides', () => {
    const svg = buildBlueprintSvg({
      mode: 'viewport', widthUnits: 100, heightUnits: 100, pxPerUnit: 2,
      state: styled('grid', { rulers: true, rulerSides: ['left'] })
    })
    const d = svg.match(/id="bp-vp-rulers" d="([^"]+)"/)![1]!
    expect(d.split('M').filter(Boolean).every(seg => seg.startsWith('0 '))).toBe(true)
  })
})

describe('viewport', () => {
  it('centres the origin in the box', () => {
    const g = viewportGeometry(1440, 900, 2, DEFAULT_DESIGN)
    expect(g.M).toBe(100)
    expect(g.m).toBe(20)
    expect([g.ox, g.oy]).toEqual([20, 50])
    expect(g.crosses).toContainEqual({ x: 720, y: 450 })
  })

  it('skips crosses when majors are under 8px apart', () => {
    expect(viewportGeometry(100, 100, 0.1, DEFAULT_DESIGN).crosses).toHaveLength(0)
  })

  it('uses prefixed ids so several SVGs can share a page', () => {
    const svg = buildBlueprintSvg({ mode: 'viewport', widthUnits: 100, heightUnits: 100, pxPerUnit: 2, state: DEFAULT_DESIGN, idPrefix: 'x' })
    expect(svg).toContain('id="x-major"')
    expect(svg).toContain('url(#x-major)')
  })
})

describe('export sizing', () => {
  it('adds bleed to print canvases', () => {
    expect(canvasUnits(printMat)).toEqual({ width: 940, height: 440, bleed: 20 })
  })

  it('desk mat at 300 dpi is 11,102 × 5,197 px', () => {
    expect(pngPixels(printMat)).toEqual({ width: 11102, height: 5197 })
    expect(outputLabel(printMat)).toBe('11,102 × 5,197 px')
  })

  it('screen PNG multiplies by scale', () => {
    const ex: ExportSettings = { ...printMat, target: 'screen', width: 2560, height: 1440, scale: 2 }
    expect(pngPixels(ex)).toEqual({ width: 5120, height: 2880 })
    expect(canvasUnits(ex)).toEqual({ width: 1280, height: 720, bleed: 0 })
  })

  it('SVG labels show mm for print and px for screen', () => {
    expect(outputLabel({ ...printMat, format: 'svg' })).toBe('940 × 440 mm')
    expect(outputLabel({ ...printMat, format: 'svg', target: 'screen', width: 1920, height: 1080 })).toBe('1,920 × 1,080 px')
  })

  it('flags Mat XL at 600 dpi as too large, desk mat at 600 dpi as fine', () => {
    const xl = pngPixels({ ...printMat, width: 1200, height: 600, dpi: 600 })
    expect(xl).toEqual({ width: 29291, height: 15118 })
    expect(exceedsCanvasLimit(xl)).toBe(true)
    expect(exceedsCanvasLimit(pngPixels({ ...printMat, dpi: 600 }))).toBe(false)
  })

  it('screen SVG is sized in px with an mm viewBox', () => {
    const svg = exportSvg(DEFAULT_DESIGN, { ...printMat, target: 'screen', width: 1920, height: 1080, format: 'svg' })
    expect(svg).toMatch(/width="1920" height="1080" viewBox="0 0 960 540"/)
  })
})
