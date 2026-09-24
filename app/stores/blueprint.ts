import { defineStore } from 'pinia'
import type {
  BlueprintColors,
  BlueprintDesign,
  ColorRole,
  Dpi,
  ExportFormat,
  ExportSettings,
  ExportTarget,
  Layout,
  Scale,
  Subdivision
} from '~/utils/blueprint/constants'
import {
  CROSS_MAX,
  CROSS_MIN,
  DEFAULT_DESIGN,
  DEFAULT_EXPORT,
  DEFAULT_PRESET,
  DEFAULT_THEME,
  MAJOR_MAX,
  MAJOR_MIN,
  PRESETS,
  THEMES,
  ZOOM_MAX,
  ZOOM_MIN
} from '~/utils/blueprint/constants'
import { canvasUnits, exceedsCanvasLimit, outputLabel as formatOutput, pngPixels } from '~/utils/blueprint/export'

export type Drawer = 'edit' | 'export'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const HEX = /^#[0-9a-f]{6}$/i

/** Colours end up inside SVG markup, so only accept plain #rrggbb. */
function isColors(v: unknown): v is BlueprintColors {
  return !!v && typeof v === 'object'
    && (['bg', 'major', 'minor', 'plus'] as const).every(k => HEX.test(String((v as Record<string, unknown>)[k])))
}

export const useBlueprintStore = defineStore('blueprint', () => {
  // Design (persisted)
  const layout = ref<Layout>(DEFAULT_DESIGN.layout)
  const major = ref(DEFAULT_DESIGN.major)
  const sub = ref<Subdivision>(DEFAULT_DESIGN.sub)
  const cross = ref(DEFAULT_DESIGN.cross)
  const colors = ref<BlueprintColors>({ ...DEFAULT_DESIGN.colors })
  const theme = ref(DEFAULT_THEME)
  const zoom = ref(1)
  const exportSettings = ref<ExportSettings>({ ...DEFAULT_EXPORT })

  // UI (not persisted)
  const editOpen = ref(false)
  const exportOpen = ref(false)

  const design = computed<BlueprintDesign>(() => ({
    layout: layout.value,
    major: major.value,
    sub: sub.value,
    cross: cross.value,
    colors: colors.value
  }))

  const minor = computed(() => Math.round(major.value / sub.value * 10) / 10)
  const specText = computed(() =>
    `${layout.value === 'grid' ? 'GRID + CROSSES' : 'RULERS + DOTS'}  ·  ${major.value} / ${minor.value} MM`)
  const roleLabels = computed<Record<ColorRole, string>>(() => ({
    bg: 'Background',
    major: layout.value === 'grid' ? 'Major grid' : 'Frame',
    minor: layout.value === 'grid' ? 'Minor grid' : 'Dots',
    plus: 'Crosses + rulers'
  }))
  const presets = computed(() => PRESETS[exportSettings.value.target])
  const canvas = computed(() => canvasUnits(exportSettings.value))
  const outputPixels = computed(() => pngPixels(exportSettings.value))
  const outputLabel = computed(() => formatOutput(exportSettings.value))
  const exceedsLimit = computed(() =>
    exportSettings.value.format === 'png' && exceedsCanvasLimit(outputPixels.value))

  // Design actions
  function setLayout(v: Layout) {
    layout.value = v
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
    layout.value = DEFAULT_DESIGN.layout
    major.value = DEFAULT_DESIGN.major
    sub.value = DEFAULT_DESIGN.sub
    cross.value = DEFAULT_DESIGN.cross
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
    layout, major, sub, cross, colors, theme, zoom, export: exportSettings, editOpen, exportOpen,
    design, minor, specText, roleLabels, presets, canvas, outputPixels, outputLabel, exceedsLimit,
    setLayout, setMajor, setSub, setCross, applyTheme, setColor, zoomBy, resetZoom, resetDesign,
    pickPreset, setTarget, setDimension, setBleed, setFormat, setDpi, setScale,
    openDrawer, closeDrawers
  }
}, {
  persist: {
    key: 'blueprint-studio',
    pick: ['layout', 'major', 'sub', 'cross', 'colors', 'theme', 'zoom', 'export'],
    // Drop anything in storage that isn't a valid colour set.
    afterHydrate: ({ store }) => {
      if (!isColors(store.colors)) store.applyTheme(DEFAULT_THEME)
    }
  }
})
