import type { BlueprintDesign, ExportSettings } from './constants'
import { MM_PER_INCH, PX_PER_MM } from './constants'
import { matchStylePreset } from './style'
import { buildBlueprintSvg } from './svg'

/**
 * Conservative browser canvas limits: Chrome and Firefox cap the area at
 * 268,435,456 px, Chrome caps a side at 32,767 px (Safari is lower still,
 * which `canvasCanHold` catches at download time).
 */
export const CANVAS_MAX_SIDE = 32_767
export const CANVAS_MAX_AREA = 268_435_456

/** Full canvas in mm: print adds bleed, screen maps px to mm at the on-screen scale. */
export function canvasUnits(ex: ExportSettings) {
  if (ex.target === 'print') {
    const b = Math.max(0, ex.bleed)
    return { width: ex.width + 2 * b, height: ex.height + 2 * b, bleed: b }
  }
  return { width: ex.width / PX_PER_MM, height: ex.height / PX_PER_MM, bleed: 0 }
}

/** Pixel size of a PNG export. */
export function pngPixels(ex: ExportSettings) {
  if (ex.target === 'print') {
    const u = canvasUnits(ex)
    return {
      width: Math.round(u.width / MM_PER_INCH * ex.dpi),
      height: Math.round(u.height / MM_PER_INCH * ex.dpi)
    }
  }
  return { width: Math.round(ex.width * ex.scale), height: Math.round(ex.height * ex.scale) }
}

export function exceedsCanvasLimit({ width, height }: { width: number, height: number }) {
  return width > CANVAS_MAX_SIDE || height > CANVAS_MAX_SIDE || width * height > CANVAS_MAX_AREA
}

const n = (v: number) => Math.round(v).toLocaleString('en-US')

/** Live output line above the Download button. */
export function outputLabel(ex: ExportSettings) {
  if (ex.format === 'png') {
    const px = pngPixels(ex)
    return `${n(px.width)} × ${n(px.height)} px`
  }
  if (ex.target === 'print') {
    const u = canvasUnits(ex)
    return `${n(u.width)} × ${n(u.height)} mm`
  }
  return `${n(ex.width)} × ${n(ex.height)} px`
}

/** SVG for the exported file. Print files are sized in mm; screen files in px. */
export function exportSvg(design: BlueprintDesign, ex: ExportSettings, pxSize?: { width: number, height: number }) {
  const u = canvasUnits(ex)
  const isPrint = ex.target === 'print'
  return buildBlueprintSvg({
    mode: 'sheet',
    widthUnits: u.width,
    heightUnits: u.height,
    pxPerUnit: pxSize ? pxSize.width / u.width : PX_PER_MM,
    state: design,
    bleed: u.bleed,
    unit: isPrint && !pxSize ? 'mm' : 'px'
  })
}

export function exportFilename(design: BlueprintDesign, ex: ExportSettings) {
  const size = `${ex.width}x${ex.height}${ex.target === 'print' ? 'mm' : 'px'}`
  const res = ex.format === 'png' ? (ex.target === 'print' ? `-${ex.dpi}dpi` : `@${ex.scale}x`) : ''
  return `blueprint-${matchStylePreset(design)}-${size}${res}.${ex.format}`
}

/** Probe whether this browser can actually allocate and draw a canvas this big. */
export function canvasCanHold(width: number, height: number) {
  if (exceedsCanvasLimit({ width, height })) return false
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  ctx.fillRect(width - 1, height - 1, 1, 1)
  const ok = ctx.getImageData(width - 1, height - 1, 1, 1).data[3] !== 0
  canvas.width = canvas.height = 0
  return ok
}

export async function svgToPngBlob(svg: string, width: number, height: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.drawImage(img, 0, 0, width, height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    canvas.width = canvas.height = 0
    if (!blob) throw new Error('The browser could not encode this PNG')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Build and download the file for the current settings. */
export async function downloadBlueprint(design: BlueprintDesign, ex: ExportSettings) {
  const filename = exportFilename(design, ex)
  if (ex.format === 'svg') {
    downloadBlob(new Blob([exportSvg(design, ex)], { type: 'image/svg+xml' }), filename)
    return
  }
  const px = pngPixels(ex)
  if (!canvasCanHold(px.width, px.height)) {
    throw new Error(`This browser can't render ${outputLabel(ex)}. Pick a lower resolution or export SVG.`)
  }
  const blob = await svgToPngBlob(exportSvg(design, ex, px), px.width, px.height)
  downloadBlob(blob, filename)
}
