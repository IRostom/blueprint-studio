import { defineStore } from 'pinia'
import type {
  BlueprintColors,
  BlueprintDesign,
  ColorRole,
  Dpi,
  ExportFormat,
  ExportSettings,
  ExportTarget,
  GridStyle,
  RulerSide,
  Scale,
  Subdivision,
  WeightKey
} from '~/utils/blueprint/constants'
import {
  CROSS_MAX,
  CROSS_MIN,
  DEFAULT_DESIGN,
  DEFAULT_EXPORT,
  DEFAULT_PRESET,
  DEFAULT_STYLE_PRESET,
  DEFAULT_THEME,
  MAJOR_MAX,
  MAJOR_MIN,
  PRESETS,
  STYLE_PRESETS,
  THEMES,
  ZOOM_MAX,
  ZOOM_MIN,
  copyStyle
} from '~/utils/blueprint/constants'
import { canvasUnits, exceedsCanvasLimit, outputLabel as formatOutput, pngPixels } from '~/utils/blueprint/export'
import { clampWeight, matchStylePreset, normalizeStyle } from '~/utils/blueprint/style'

export type Drawer = 'edit' | 'export'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const HEX = /^#[0-9a-f]{6}$/i

const STORAGE_KEY = 'blueprint-studio'

/** Colours end up inside SVG markup, so only accept plain #rrggbb. */
function isColors(v: unknown): v is BlueprintColors {
  return !!v && typeof v === 'object'
    && (['bg', 'major', 'minor', 'plus', 'ruler'] as const).every(k => HEX.test(String((v as Record<string, unknown>)[k])))
}

/** The raw persisted object, to tell older saves apart. */
function savedState(): Record<string, unknown> | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}

export const useBlueprintStore = defineStore('blueprint', () => {
  // Design (persisted)
  const major = ref(DEFAULT_DESIGN.major)
  const sub = ref<Subdivision>(DEFAULT_DESIGN.sub)
  const cross = ref(DEFAULT_DESIGN.cross)
  const colors = ref<BlueprintColors>({ ...DEFAULT_DESIGN.colors })
  const style = ref<GridStyle>(copyStyle(DEFAULT_DESIGN.style))
  const theme = ref(DEFAULT_THEME)
  const zoom = ref(1)
  const exportSettings = ref<ExportSettings>({ ...DEFAULT_EXPORT })

  // UI (not persisted)
  const editOpen = ref(false)
  const exportOpen = ref(false)

  const design = computed<BlueprintDesign>(() => ({
    major: major.value,
    sub: sub.value,
    cross: cross.value,
    colors: colors.value,
    style: style.value
  }))

  /** Preset id the current layers match, or `custom`. */
  const stylePreset = computed(() => matchStylePreset(design.value))
  const minor = computed(() => Math.round(major.value / sub.value * 10) / 10)
  const specText = computed(() => {
    const name = STYLE_PRESETS.find(p => p.id === stylePreset.value)?.name ?? 'Custom'
    return `${name.toUpperCase()}  ·  ${major.value} / ${minor.value} MM`
  })
  const roleLabels: Record<ColorRole, string> = {
    bg: 'Background',
    major: 'Major grid + border',
    minor: 'Minor grid',
    plus: 'Crosses',
    ruler: 'Rulers + title block'
  }
  const presets = computed(() => PRESETS[exportSettings.value.target])
  const canvas = computed(() => canvasUnits(exportSettings.value))
  const outputPixels = computed(() => pngPixels(exportSettings.value))
  const outputLabel = computed(() => formatOutput(exportSettings.value))
  const exceedsLimit = computed(() =>
    exportSettings.value.format === 'png' && exceedsCanvasLimit(outputPixels.value))

  // Design actions
  function applyStylePreset(id: string) {
    const p = STYLE_PRESETS.find(p => p.id === id)
    if (!p) return
    style.value = copyStyle(p.style)
    cross.value = p.cross
  }
  /** Validates and clamps through the same guard as persisted state. */
  function setStyle<K extends keyof GridStyle>(key: K, v: GridStyle[K]) {
    const next = normalizeStyle({ ...style.value, [key]: v })
    if (next) style.value = next
  }
  function setWeight(key: WeightKey, v: number) {
    if (Number.isFinite(v)) style.value = { ...style.value, weights: { ...style.value.weights, [key]: clampWeight(key, v) } }
  }
  function toggleRulerSide(side: RulerSide) {
    const on = style.value.rulerSides.includes(side)
    setStyle('rulerSides', on ? style.value.rulerSides.filter(s => s !== side) : [...style.value.rulerSides, side])
  }
  function setMajor(v: number) {
    if (Number.isFinite(v)) major.value = clamp(v, MAJOR_MIN, MAJOR_MAX)
  }
  function setSub(v: Subdivision) {
    sub.value = v
  }
  function setCross(v: number) {
    if (Number.isFinite(v)) cross.value = clamp(v, CROSS_MIN, CROSS_MAX)
  }
  function applyTheme(id: string) {
    const t = THEMES.find(t => t.id === id)
    if (!t) return
    theme.value = t.id
    colors.value = { ...t.colors }
  }
  function setColor(role: ColorRole, hex: string) {
    if (!HEX.test(hex)) return
    theme.value = 'custom'
    colors.value = { ...colors.value, [role]: hex }
  }
  function zoomBy(factor: number) {
    zoom.value = clamp(zoom.value * factor, ZOOM_MIN, ZOOM_MAX)
  }
  function resetZoom() {
    zoom.value = 1
  }
  function resetDesign() {
    major.value = DEFAULT_DESIGN.major
    sub.value = DEFAULT_DESIGN.sub
    applyStylePreset(DEFAULT_STYLE_PRESET)
    theme.value = DEFAULT_THEME
    colors.value = { ...DEFAULT_DESIGN.colors }
    zoom.value = 1
  }

  // Export actions
  function pickPreset(id: string) {
    const p = presets.value.find(p => p.id === id)
    if (!p) return
    Object.assign(exportSettings.value, { preset: p.id, width: p.width, height: p.height })
  }
  function setTarget(target: ExportTarget) {
    if (exportSettings.value.target === target) return
    exportSettings.value.target = target
    pickPreset(DEFAULT_PRESET[target])
  }
  function setDimension(key: 'width' | 'height', v: number) {
    if (!(v > 0)) return
    exportSettings.value[key] = v
    exportSettings.value.preset = 'custom'
  }
  function setBleed(v: number) {
    if (v >= 0) exportSettings.value.bleed = v
  }
  function setFormat(v: ExportFormat) {
    exportSettings.value.format = v
  }
  function setDpi(v: Dpi) {
    exportSettings.value.dpi = v
  }
  function setScale(v: Scale) {
    exportSettings.value.scale = v
  }

  // Drawers
  function openDrawer(which: Drawer) {
    editOpen.value = which === 'edit'
    exportOpen.value = which === 'export'
  }
  function closeDrawers() {
    editOpen.value = false
    exportOpen.value = false
  }

  return {
    major, sub, cross, colors, style, theme, zoom, export: exportSettings, editOpen, exportOpen,
    design, stylePreset, minor, specText, roleLabels, presets, canvas, outputPixels, outputLabel, exceedsLimit,
    applyStylePreset, setStyle, setWeight, toggleRulerSide,
    setMajor, setSub, setCross, applyTheme, setColor, zoomBy, resetZoom, resetDesign,
    pickPreset, setTarget, setDimension, setBleed, setFormat, setDpi, setScale,
    openDrawer, closeDrawers
  }
}, {
  persist: {
    key: STORAGE_KEY,
    pick: ['major', 'sub', 'cross', 'colors', 'style', 'theme', 'zoom', 'export'],
    afterHydrate: ({ store }) => {
      // Saves from before the ruler colour existed: rulers used the crosses colour.
      const saved = store.colors as Partial<BlueprintColors> | undefined
      if (saved && typeof saved === 'object' && saved.ruler === undefined) {
        store.colors = { ...saved, ruler: saved.plus } as BlueprintColors
      }
      // Drop anything in storage that isn't a valid colour set.
      if (!isColors(store.colors)) store.applyTheme(DEFAULT_THEME)
      // Older saves had `layout: 'grid' | 'rulers'` instead of layers; the
      // rulers layout drew crosses at 0.7× the saved size.
      const raw = savedState()
      if (raw && !('style' in raw)) {
        const rulers = raw.layout === 'rulers'
        const savedCross = store.cross
        store.applyStylePreset(rulers ? 'rulers' : DEFAULT_STYLE_PRESET)
        store.setCross(Math.round(rulers ? savedCross * 0.7 : savedCross))
        return
      }
      const style = normalizeStyle(store.style)
      if (style) store.style = style
      else store.applyStylePreset(DEFAULT_STYLE_PRESET)
    }
  }
})
