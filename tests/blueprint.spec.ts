import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { BlueprintDesign, ExportSettings } from '../app/utils/blueprint/constants'
import { DEFAULT_DESIGN, DEFAULT_EXPORT } from '../app/utils/blueprint/constants'
import { gridSheetGeometry, rulersSheetGeometry, viewportGeometry } from '../app/utils/blueprint/geometry'
import { buildBlueprintSvg } from '../app/utils/blueprint/svg'
import { canvasUnits, exceedsCanvasLimit, exportSvg, outputLabel, pngPixels } from '../app/utils/blueprint/export'

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

describe('grid sheet matches make_blueprint.py', () => {
  // make_blueprint.py: 940×440 canvas, 50/10 mm, half-arm 3 mm.
  const design: BlueprintDesign = { ...DEFAULT_DESIGN, cross: 3 }
  const ours = exportSvg(design, printMat)
  const ref = fixture('blueprint-deskmat.svg')

  it('fits 16 × 6 major cells', () => {
    const g = gridSheetGeometry(940, 440, 20, design)
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
  const design: BlueprintDesign = { ...DEFAULT_DESIGN, layout: 'rulers' }
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
    expect(rulersSheetGeometry(100, 80, 0, design).titleBlock).toBeNull()
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
