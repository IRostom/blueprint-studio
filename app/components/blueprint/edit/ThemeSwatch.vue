<script setup lang="ts">
import type { Theme } from '~/utils/blueprint/constants'

const props = defineProps<{ theme: Theme, selected: boolean }>()
defineEmits<{ pick: [] }>()

const swatch = computed(() => {
  const c = props.theme.colors
  const plus = `linear-gradient(${c.plus},${c.plus})`
  return {
    backgroundColor: c.bg,
    backgroundImage: `${plus} center/10px 1.5px no-repeat,${plus} center/1.5px 10px no-repeat,`
      + `linear-gradient(to right,${c.major} 1px,transparent 1px),linear-gradient(to bottom,${c.major} 1px,transparent 1px)`,
    backgroundSize: 'auto,auto,17px 17px,17px 17px',
    backgroundPosition: '0 0,0 0,8px 9px,8px 9px'
  }
})
</script>

<template>
  <button
    type="button"
    :aria-pressed="selected"
    class="flex flex-col items-stretch gap-1.5 border bg-transparent px-1 pt-1 pb-1.5 text-bp-text"
    :class="selected ? 'border-bp-text' : 'border-transparent'"
    @click="$emit('pick')"
  >
    <span
      class="block h-9"
      :style="swatch"
    />
    <span class="text-[11px]">{{ theme.name }}</span>
  </button>
</template>
