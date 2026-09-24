<script setup lang="ts">
import type { BlueprintColors, Layout } from '~/utils/blueprint/constants'

const props = defineProps<{
  layout: Layout
  name: string
  selected: boolean
  colors: BlueprintColors
}>()

defineEmits<{ pick: [] }>()

const thumb = computed(() => {
  const c = props.colors
  return props.layout === 'grid'
    ? {
        backgroundColor: c.bg,
        backgroundImage: `linear-gradient(to right,${c.major} 1px,transparent 1px),linear-gradient(to bottom,${c.major} 1px,transparent 1px)`,
        backgroundSize: '20px 20px',
        backgroundPosition: '9px 9px'
      }
    : {
        backgroundColor: c.bg,
        backgroundImage: `radial-gradient(circle,${c.minor} 1px,transparent 1.5px)`,
        backgroundSize: '8px 8px'
      }
})
</script>

<template>
  <button
    type="button"
    :aria-pressed="selected"
    class="flex flex-col gap-2.5 border px-1.5 pt-1.5 pb-2.5 text-bp-text"
    :class="selected ? 'border-bp-text bg-[rgba(234,242,255,0.1)]' : 'border-bp-control bg-transparent'"
    @click="$emit('pick')"
  >
    <span
      class="block h-16 w-full"
      :style="thumb"
    />
    <span class="text-left text-[13px] font-medium">{{ name }}</span>
  </button>
</template>
