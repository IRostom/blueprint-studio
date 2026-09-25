<script setup lang="ts">
const store = useBlueprintStore()
const label = computed(() => `${Math.round(store.zoom * 100)}%`)
</script>

<template>
  <div
    class="absolute bottom-8 flex items-center border border-[color-mix(in_srgb,var(--bp-major)_60%,transparent)] bg-bp-glass-light backdrop-blur-[10px] transition-[left] duration-[320ms] ease-drawer"
    :class="store.editOpen ? 'left-[392px]' : 'left-8'"
  >
    <button
      type="button"
      aria-label="Zoom out"
      class="flex size-10 items-center justify-center text-bp-text"
      @click="store.zoomBy(1 / 1.25)"
    >
      <BlueprintGlyph name="minus" />
    </button>
    <button
      type="button"
      aria-label="Reset zoom"
      class="h-10 min-w-15 border-x border-[rgba(234,242,255,0.22)] font-mono text-xs text-bp-text"
      @click="store.resetZoom()"
    >
      <span aria-live="polite">{{ label }}</span>
    </button>
    <button
      type="button"
      aria-label="Zoom in"
      class="flex size-10 items-center justify-center text-bp-text"
      @click="store.zoomBy(1.25)"
    >
      <BlueprintGlyph name="plus" />
    </button>
  </div>
</template>
