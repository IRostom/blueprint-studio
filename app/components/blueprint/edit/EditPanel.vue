<script setup lang="ts">
import type { ColorRole, Layout, Subdivision } from '~/utils/blueprint/constants'
import {
  CROSS_MAX,
  CROSS_MIN,
  MAJOR_MAX,
  MAJOR_MIN,
  MAJOR_STEP,
  SUBDIVISIONS,
  THEMES
} from '~/utils/blueprint/constants'

const store = useBlueprintStore()

const STYLES: { id: Layout, name: string }[] = [
  { id: 'grid', name: 'Grid + crosses' },
  { id: 'rulers', name: 'Rulers + dots' }
]
const ROLES: ColorRole[] = ['bg', 'major', 'minor', 'plus']
const subOptions = SUBDIVISIONS.map(n => ({ value: n, label: `÷${n}` }))

const sub = computed<Subdivision>({
  get: () => store.sub,
  set: v => store.setSub(v)
})

const num = (e: Event) => parseFloat((e.target as HTMLInputElement).value)
</script>

<template>
  <div class="flex flex-col gap-7">
    <BlueprintPanelSection label="STYLE">
      <div class="grid grid-cols-2 gap-2">
        <BlueprintEditStyleCard
          v-for="s in STYLES"
          :key="s.id"
          :layout="s.id"
          :name="s.name"
          :selected="store.layout === s.id"
          :colors="store.colors"
          @pick="store.setLayout(s.id)"
        />
      </div>
    </BlueprintPanelSection>

    <BlueprintPanelSection
      label="GRID"
      gap="md"
    >
      <label class="flex flex-col gap-2.5">
        <span class="flex items-center justify-between text-[13px]">
          <span>Major spacing</span>
          <span class="font-mono text-xs">{{ store.major }} mm</span>
        </span>
        <input
          type="range"
          :min="MAJOR_MIN"
          :max="MAJOR_MAX"
          :step="MAJOR_STEP"
          :value="store.major"
          @input="store.setMajor(num($event))"
        >
      </label>

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

      <label class="flex flex-col gap-2.5">
        <span class="flex items-center justify-between text-[13px]">
          <span>Cross size</span>
          <span class="font-mono text-xs">{{ store.cross * 2 }} mm</span>
        </span>
        <input
          type="range"
          :min="CROSS_MIN"
          :max="CROSS_MAX"
          step="1"
          :value="store.cross"
          @input="store.setCross(num($event))"
        >
      </label>
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
