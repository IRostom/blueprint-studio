<script setup lang="ts">
// The prototype's hairline stroke glyphs, kept exact rather than swapped for an icon set.
const props = withDefaults(defineProps<{
  name: 'edit' | 'download' | 'minus' | 'plus' | 'close'
  size?: number
  strokeWidth?: number
}>(), { size: 14, strokeWidth: 1.4 })

const GLYPHS = {
  edit: { box: 14, d: ['M9.5 1.5l3 3L4.5 12.5H1.5v-3z', 'M8 3l3 3'] },
  download: { box: 14, d: ['M7 1.5v8M3.5 6.5L7 10l3.5-3.5M1.5 12.5h11'] },
  minus: { box: 14, d: ['M2 7h10'] },
  plus: { box: 14, d: ['M2 7h10M7 2v10'] },
  close: { box: 12, d: ['M1.5 1.5l9 9M10.5 1.5l-9 9'] }
} as const

const glyph = computed(() => GLYPHS[props.name])
</script>

<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${glyph.box} ${glyph.box}`"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    aria-hidden="true"
    focusable="false"
  >
    <path
      v-for="d in glyph.d"
      :key="d"
      :d="d"
    />
  </svg>
</template>
