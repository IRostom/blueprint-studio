<script setup lang="ts" generic="T extends string | number">
defineProps<{
  options: { value: T, label: string }[]
  label: string
  mono?: boolean
}>()

const model = defineModel<T>({ required: true })
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    class="grid"
    :style="{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }"
  >
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      :aria-pressed="model === o.value"
      class="-ml-px h-10 border text-[13px] first:ml-0"
      :class="[
        model === o.value ? 'border-bp-text bg-bp-text text-bp-selected-text' : 'border-bp-control bg-transparent text-bp-text',
        mono ? 'font-mono' : 'font-medium'
      ]"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>
