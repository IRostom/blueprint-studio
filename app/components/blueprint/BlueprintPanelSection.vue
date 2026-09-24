<script setup lang="ts">
withDefaults(defineProps<{ label: string, gap?: 'sm' | 'md' }>(), { gap: 'sm' })
</script>

<template>
  <section
    class="flex flex-col"
    :class="gap === 'md' ? 'gap-4' : 'gap-3'"
  >
    <h3 class="font-mono text-[11px] font-normal tracking-[0.16em] text-bp-muted">
      {{ label }}
    </h3>
    <slot />
  </section>
</template>
