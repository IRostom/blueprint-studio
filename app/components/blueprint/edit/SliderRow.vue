<script setup lang="ts">
defineProps<{
  label: string
  value: number
  display: string
  min: number
  max: number
  step: number
  disabled?: boolean
}>()

defineEmits<{ input: [value: number] }>()
</script>

<template>
  <label
    class="flex flex-col gap-2.5"
    :class="{ 'opacity-40': disabled }"
  >
    <span class="flex items-center justify-between text-[13px]">
      <span>{{ label }}</span>
      <span class="font-mono text-xs">{{ display }}</span>
    </span>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="value"
      :disabled="disabled"
      @input="$emit('input', parseFloat(($event.target as HTMLInputElement).value))"
    >
  </label>
</template>
