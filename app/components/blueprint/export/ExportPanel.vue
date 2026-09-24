<script setup lang="ts">
import type { Dpi, ExportFormat, ExportTarget, Scale } from '~/utils/blueprint/constants'
import { DPI_OPTIONS, SCALE_OPTIONS } from '~/utils/blueprint/constants'

const store = useBlueprintStore()

const isPrint = computed(() => store.export.target === 'print')

const target = computed<ExportTarget>({
  get: () => store.export.target,
  set: v => store.setTarget(v)
})
const format = computed<ExportFormat>({
  get: () => store.export.format,
  set: v => store.setFormat(v)
})
const dpi = computed<Dpi>({
  get: () => store.export.dpi,
  set: v => store.setDpi(v)
})
const scale = computed<Scale>({
  get: () => store.export.scale,
  set: v => store.setScale(v)
})

const TARGETS = [{ value: 'print' as const, label: 'Print' }, { value: 'screen' as const, label: 'Screen' }]
const FORMATS = [{ value: 'png' as const, label: 'PNG' }, { value: 'svg' as const, label: 'SVG' }]
const dpiOptions = DPI_OPTIONS.map(d => ({ value: d, label: `${d} dpi` }))
const scaleOptions = SCALE_OPTIONS.map(s => ({ value: s, label: `${s}x` }))

/** Apply a number input on change; snap the field back if the value is rejected. */
function onNumber(e: Event, apply: (v: number) => void, current: () => number) {
  const input = e.target as HTMLInputElement
  apply(parseFloat(input.value))
  input.value = String(current())
}

const fieldClass = 'h-10 w-full box-border border border-bp-control bg-white/6 px-2.5 font-mono text-[13px] text-bp-text'
const fieldLabelClass = 'flex flex-col gap-1.5 font-mono text-[10px] tracking-[0.12em] text-bp-muted'
</script>

<template>
  <div class="flex flex-col gap-6">
    <BlueprintSegmentedGroup
      v-model="target"
      :options="TARGETS"
      label="Export target"
    />

    <BlueprintExportPreview />

    <BlueprintPanelSection label="SIZE">
      <div class="grid grid-cols-3 gap-1.5">
        <button
          v-for="p in store.presets"
          :key="p.id"
          type="button"
          :aria-pressed="store.export.preset === p.id"
          class="flex h-13 flex-col items-center justify-center gap-0.5 border p-1"
          :class="store.export.preset === p.id ? 'border-bp-text bg-bp-text text-bp-selected-text' : 'border-bp-control bg-transparent text-bp-text'"
          @click="store.pickPreset(p.id)"
        >
          <span class="text-xs font-medium">{{ p.label }}</span>
          <span class="font-mono text-[10px] opacity-80">{{ p.width }}×{{ p.height }}</span>
        </button>
      </div>
      <div class="flex items-end gap-2">
        <label
          class="grow"
          :class="fieldLabelClass"
        >
          WIDTH{{ isPrint ? ' MM' : ' PX' }}
          <input
            type="number"
            min="1"
            :value="store.export.width"
            :class="fieldClass"
            @change="onNumber($event, v => store.setDimension('width', v), () => store.export.width)"
          >
        </label>
        <label
          class="grow"
          :class="fieldLabelClass"
        >
          HEIGHT{{ isPrint ? ' MM' : ' PX' }}
          <input
            type="number"
            min="1"
            :value="store.export.height"
            :class="fieldClass"
            @change="onNumber($event, v => store.setDimension('height', v), () => store.export.height)"
          >
        </label>
        <label
          v-if="isPrint"
          class="w-18 shrink-0"
          :class="fieldLabelClass"
        >
          BLEED
          <input
            type="number"
            min="0"
            :value="store.export.bleed"
            :class="fieldClass"
            @change="onNumber($event, store.setBleed, () => store.export.bleed)"
          >
        </label>
      </div>
    </BlueprintPanelSection>

    <BlueprintPanelSection label="FILE">
      <BlueprintSegmentedGroup
        v-model="format"
        :options="FORMATS"
        label="File format"
      />
      <template v-if="format === 'png'">
        <BlueprintSegmentedGroup
          v-if="isPrint"
          v-model="dpi"
          :options="dpiOptions"
          label="Resolution"
        />
        <BlueprintSegmentedGroup
          v-else
          v-model="scale"
          :options="scaleOptions"
          label="Scale"
        />
      </template>
    </BlueprintPanelSection>
  </div>
</template>
