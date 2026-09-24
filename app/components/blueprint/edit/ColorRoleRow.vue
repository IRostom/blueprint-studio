<script setup lang="ts">
defineProps<{ label: string, hex: string }>()
defineEmits<{ input: [hex: string] }>()
</script>

<template>
  <label class="flex h-12 items-center gap-3 border-b border-bp-hairline">
    <input
      type="color"
      :value="hex"
      class="size-6 shrink-0"
      @input="$emit('input', ($event.target as HTMLInputElement).value)"
    >
    <span class="grow text-[13px]">{{ label }}</span>
    <span class="font-mono text-xs text-bp-muted">{{ hex.toUpperCase() }}</span>
  </label>
</template>
