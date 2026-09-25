<script setup lang="ts">
import type { BlueprintColors, StylePreset } from '~/utils/blueprint/constants'
import { presetDesign } from '~/utils/blueprint/style'
import { buildBlueprintSvg } from '~/utils/blueprint/svg'

const props = defineProps<{
  preset: StylePreset
  selected: boolean
  colors: BlueprintColors
}>()

defineEmits<{ pick: [] }>()

// Thumbnail: the real viewport renderer at a small scale, wider than the card and clipped.
const THUMB_W = 200
const THUMB_H = 64
const P = 0.8

const thumb = computed(() => buildBlueprintSvg({
  mode: 'viewport',
  widthUnits: THUMB_W / P,
  heightUnits: THUMB_H / P,
  pxPerUnit: P,
  state: presetDesign(props.preset.id, { colors: props.colors }),
  idPrefix: `bp-thumb-${props.preset.id}`
}))
</script>

<template>
  <button
    type="button"
    :aria-pressed="selected"
    class="flex flex-col gap-2.5 border px-1.5 pt-1.5 pb-2.5 text-bp-text"
    :class="selected ? 'border-bp-text bg-[rgba(234,242,255,0.1)]' : 'border-bp-control bg-transparent'"
    @click="$emit('pick')"
  >
    <!-- eslint-disable vue/no-v-html -- SVG is built locally from preset numbers and validated hex colours -->
    <span
      class="flex h-16 w-full justify-center overflow-hidden [&>svg]:block [&>svg]:shrink-0"
      v-html="thumb"
    />
    <!-- eslint-enable vue/no-v-html -->
    <span class="text-left text-[13px] font-medium">{{ preset.name }}</span>
  </button>
</template>
