<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { PX_PER_MM } from '~/utils/blueprint/constants'
import { buildBlueprintSvg } from '~/utils/blueprint/svg'

const store = useBlueprintStore()
const { width, height } = useWindowSize()

// Grid origin sits at the window centre and re-centres on resize.
const svg = computed(() => {
  const p = PX_PER_MM * store.zoom
  return buildBlueprintSvg({
    mode: 'viewport',
    widthUnits: width.value / p,
    heightUnits: height.value / p,
    pxPerUnit: p,
    state: store.design
  })
})
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- SVG is built locally from store numbers and validated hex colours -->
  <div
    class="pointer-events-none absolute inset-0 [&>svg]:block"
    v-html="svg"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>
