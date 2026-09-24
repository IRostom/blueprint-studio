<script setup lang="ts">
const store = useBlueprintStore()
</script>

<template>
  <span
    class="pointer-events-none absolute bottom-11 font-mono text-[11px] tracking-[0.16em] whitespace-pre text-(--bp-plus) opacity-80 transition-[right] duration-[320ms] ease-drawer"
    :class="store.exportOpen ? 'right-[412px]' : 'right-8'"
  >{{ store.specText }}</span>
</template>
