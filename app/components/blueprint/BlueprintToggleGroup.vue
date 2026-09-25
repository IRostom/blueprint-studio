<script setup lang="ts" generic="T extends string | number">
defineProps<{
  options: { value: T, label: string }[]
  selected: T[]
  label: string
  disabled?: boolean
}>()

defineEmits<{ toggle: [value: T] }>()
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    class="grid"
    :class="{ 'opacity-40': disabled }"
    :style="{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }"
  >
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      :aria-pressed="selected.includes(o.value)"
      :disabled="disabled"
      class="-ml-px h-10 border text-[13px] font-medium first:ml-0"
      :class="selected.includes(o.value) ? 'border-bp-text bg-bp-text text-bp-selected-text' : 'border-bp-control bg-transparent text-bp-text'"
      @click="$emit('toggle', o.value)"
    >
      {{ o.label }}
    </button>
  </div>
</template>
