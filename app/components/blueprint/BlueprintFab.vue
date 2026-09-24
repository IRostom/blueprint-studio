<script setup lang="ts">
defineProps<{
  side: 'left' | 'right'
  label: string
  icon: 'edit' | 'download'
  /** Drawer this button opens; the button fades out while it is open. */
  controls: string
  expanded: boolean
}>()

defineEmits<{ click: [] }>()

const el = useTemplateRef<HTMLButtonElement>('el')
defineExpose({ focus: () => el.value?.focus({ preventScroll: true }) })
</script>

<template>
  <button
    ref="el"
    type="button"
    :aria-expanded="expanded"
    :aria-controls="controls"
    :tabindex="expanded ? -1 : undefined"
    class="bp-reg-marks absolute top-8 flex h-11 items-center gap-2.5 border border-[color-mix(in_srgb,var(--bp-major)_60%,transparent)] bg-bp-glass-light px-5 font-mono text-xs font-medium tracking-[0.18em] text-bp-text uppercase backdrop-blur-[10px] transition-opacity duration-200"
    :class="[side === 'left' ? 'left-8' : 'right-8', expanded && 'pointer-events-none opacity-0']"
    @click="$emit('click')"
  >
    <BlueprintGlyph :name="icon" />
    <span>{{ label }}</span>
  </button>
</template>
