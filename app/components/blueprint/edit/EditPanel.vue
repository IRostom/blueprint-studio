<script setup lang="ts">
import type { ColorRole, GridFit, GridStyle, MarkStyle, RulerSide, RulerUnits, Subdivision, WeightKey } from '~/utils/blueprint/constants'
import {
  CROSS_MAX,
  CROSS_MIN,
  MAJOR_MAX,
  MAJOR_MIN,
  MAJOR_STEP,
  MARGIN_MAX,
  MARGIN_MIN,
  RULER_CLEAR_MAX,
  RULER_CLEAR_MIN,
  STYLE_PRESETS,
  SUBDIVISIONS,
  THEMES,
  WEIGHT_LIMITS
} from '~/utils/blueprint/constants'

const store = useBlueprintStore()

const ROLES: ColorRole[] = ['bg', 'major', 'minor', 'plus', 'ruler']
const subOptions = SUBDIVISIONS.map(n => ({ value: n, label: `÷${n}` }))
const markOptions: { value: MarkStyle, label: string }[] = [
  { value: 'lines', label: 'Lines' },
  { value: 'dots', label: 'Dots' },
  { value: 'none', label: 'Off' }
]
const onOffOptions: { value: 'on' | 'off', label: string }[] = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' }
]
const fitOptions: { value: GridFit, label: string }[] = [
  { value: 'cells', label: 'Whole cells' },
  { value: 'sheet', label: 'Full sheet' }
]
const sideOptions: { value: RulerSide, label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'right', label: 'Right' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' }
]
const unitOptions: { value: RulerUnits, label: string }[] = [
  { value: 'mixed', label: 'cm + in' },
  { value: 'cm', label: 'cm' },
  { value: 'inch', label: 'in' }
]

const sub = computed<Subdivision>({
  get: () => store.sub,
  set: v => store.setSub(v)
})

/** Two-way binding for one style field. */
function styleModel<K extends keyof GridStyle>(key: K) {
  return computed<GridStyle[K]>({
    get: () => store.style[key],
    set: v => store.setStyle(key, v)
  })
}
/** Two-way On/Off binding for a boolean style field. */
function toggleModel(key: 'crosses' | 'edgeCrosses' | 'rulers' | 'border' | 'titleBlock') {
  return computed<'on' | 'off'>({
    get: () => store.style[key] ? 'on' : 'off',
    set: v => store.setStyle(key, v === 'on')
  })
}

const majorStyle = styleModel('majorStyle')
const minorStyle = styleModel('minorStyle')
const fit = styleModel('fit')
const rulerUnits = styleModel('rulerUnits')
const crosses = toggleModel('crosses')
const edgeCrosses = toggleModel('edgeCrosses')
const border = toggleModel('border')
const rulers = toggleModel('rulers')
const titleBlock = toggleModel('titleBlock')

const w = computed(() => store.style.weights)
const WEIGHTS = computed<{ key: WeightKey, label: string, display: string, disabled: boolean }[]>(() => [
  { key: 'minor', label: 'Minor line', display: `${w.value.minor} mm`, disabled: store.style.minorStyle !== 'lines' },
  { key: 'minorOpacity', label: 'Minor line opacity', display: `${Math.round(w.value.minorOpacity * 100)}%`, disabled: store.style.minorStyle !== 'lines' },
  { key: 'major', label: 'Major line', display: `${w.value.major} mm`, disabled: store.style.majorStyle !== 'lines' },
  { key: 'dot', label: 'Dot radius', display: `${w.value.dot} mm`, disabled: store.style.majorStyle !== 'dots' && store.style.minorStyle !== 'dots' },
  { key: 'border', label: 'Border', display: `${w.value.border} mm`, disabled: !store.style.border },
  { key: 'cross', label: 'Cross', display: `${w.value.cross} mm`, disabled: !store.style.crosses }
])
</script>

<template>
  <div class="flex flex-col gap-7">
    <BlueprintPanelSection label="STYLE">
      <div class="grid grid-cols-2 gap-2">
        <BlueprintEditStyleCard
          v-for="p in STYLE_PRESETS"
          :key="p.id"
          :preset="p"
          :selected="store.stylePreset === p.id"
          :colors="store.colors"
          @pick="store.applyStylePreset(p.id)"
        />
      </div>
    </BlueprintPanelSection>

    <BlueprintPanelSection
      label="GRID"
      gap="md"
    >
      <BlueprintEditSliderRow
        label="Major spacing"
        :value="store.major"
        :display="`${store.major} mm`"
        :min="MAJOR_MIN"
        :max="MAJOR_MAX"
        :step="MAJOR_STEP"
        @input="store.setMajor($event)"
      />

      <div class="flex flex-col gap-2.5">
        <span class="flex items-center justify-between text-[13px]">
          <span>Subdivisions</span>
          <span class="font-mono text-xs text-bp-muted">minor {{ store.minor }} mm</span>
        </span>
        <BlueprintSegmentedGroup
          v-model="sub"
          :options="subOptions"
          label="Subdivisions"
          mono
        />
      </div>

      <div class="flex flex-col gap-2.5">
        <span class="text-[13px]">Grid area</span>
        <BlueprintSegmentedGroup
          v-model="fit"
          :options="fitOptions"
          label="Grid area"
        />
      </div>

      <BlueprintEditSliderRow
        label="Margin"
        :value="store.style.margin"
        :display="`${store.style.margin} mm`"
        :min="MARGIN_MIN"
        :max="MARGIN_MAX"
        :step="1"
        @input="store.setStyle('margin', $event)"
      />
    </BlueprintPanelSection>

    <BlueprintPanelSection
      label="LAYERS"
      gap="md"
    >
      <div class="flex flex-col gap-2.5">
        <span class="text-[13px]">Major grid</span>
        <BlueprintSegmentedGroup
          v-model="majorStyle"
          :options="markOptions"
          label="Major grid"
        />
      </div>

      <div class="flex flex-col gap-2.5">
        <span class="text-[13px]">Minor grid</span>
        <BlueprintSegmentedGroup
          v-model="minorStyle"
          :options="markOptions"
          label="Minor grid"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-2.5">
          <span class="text-[13px]">Crosses</span>
          <BlueprintSegmentedGroup
            v-model="crosses"
            :options="onOffOptions"
            label="Crosses"
          />
        </div>
        <div class="flex flex-col gap-2.5">
          <span class="text-[13px]">Crosses on edges</span>
          <BlueprintSegmentedGroup
            v-model="edgeCrosses"
            :options="onOffOptions"
            label="Crosses on edges"
            :disabled="!store.style.crosses"
          />
        </div>
      </div>

      <BlueprintEditSliderRow
        label="Cross size"
        :value="store.cross"
        :display="`${store.cross * 2} mm`"
        :min="CROSS_MIN"
        :max="CROSS_MAX"
        :step="1"
        :disabled="!store.style.crosses"
        @input="store.setCross($event)"
      />

      <div class="flex flex-col gap-2.5">
        <span class="text-[13px]">Border</span>
        <BlueprintSegmentedGroup
          v-model="border"
          :options="onOffOptions"
          label="Border"
        />
      </div>
    </BlueprintPanelSection>

    <BlueprintPanelSection
      label="RULERS"
      gap="md"
    >
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-2.5">
          <span class="text-[13px]">Rulers</span>
          <BlueprintSegmentedGroup
            v-model="rulers"
            :options="onOffOptions"
            label="Rulers"
          />
        </div>
        <div class="flex flex-col gap-2.5">
          <span class="text-[13px]">Title block</span>
          <BlueprintSegmentedGroup
            v-model="titleBlock"
            :options="onOffOptions"
            label="Title block"
          />
        </div>
      </div>

      <div class="flex flex-col gap-2.5">
        <span class="text-[13px]">Sides</span>
        <BlueprintToggleGroup
          :options="sideOptions"
          :selected="store.style.rulerSides"
          label="Ruler sides"
          :disabled="!store.style.rulers"
          @toggle="store.toggleRulerSide($event)"
        />
      </div>

      <div class="flex flex-col gap-2.5">
        <span class="text-[13px]">Units</span>
        <BlueprintSegmentedGroup
          v-model="rulerUnits"
          :options="unitOptions"
          label="Ruler units"
          :disabled="!store.style.rulers"
        />
      </div>

      <BlueprintEditSliderRow
        label="Clearance from grid marks"
        :value="store.style.rulerClear"
        :display="`${store.style.rulerClear} mm`"
        :min="RULER_CLEAR_MIN"
        :max="RULER_CLEAR_MAX"
        :step="1"
        :disabled="!store.style.rulers"
        @input="store.setStyle('rulerClear', $event)"
      />
    </BlueprintPanelSection>

    <BlueprintPanelSection
      label="WEIGHTS"
      gap="md"
    >
      <BlueprintEditSliderRow
        v-for="row in WEIGHTS"
        :key="row.key"
        :label="row.label"
        :value="w[row.key]"
        :display="row.display"
        :min="WEIGHT_LIMITS[row.key][0]"
        :max="WEIGHT_LIMITS[row.key][1]"
        :step="WEIGHT_LIMITS[row.key][2]"
        :disabled="row.disabled"
        @input="store.setWeight(row.key, $event)"
      />
    </BlueprintPanelSection>

    <BlueprintPanelSection label="COLOUR">
      <div class="grid grid-cols-4 gap-2">
        <BlueprintEditThemeSwatch
          v-for="t in THEMES"
          :key="t.id"
          :theme="t"
          :selected="store.theme === t.id"
          @pick="store.applyTheme(t.id)"
        />
      </div>
      <div class="flex flex-col border-t border-bp-hairline">
        <BlueprintEditColorRoleRow
          v-for="role in ROLES"
          :key="role"
          :label="store.roleLabels[role]"
          :hex="store.colors[role]"
          @input="store.setColor(role, $event)"
        />
      </div>
    </BlueprintPanelSection>
  </div>
</template>
