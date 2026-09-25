<script setup lang="ts">
const props = defineProps<{
  id: string
  side: 'left' | 'right'
  width: number
  open: boolean
  title: string
  closeLabel: string
}>()

defineEmits<{ close: [] }>()

const body = useTemplateRef<HTMLElement>('body')

// Move focus into the drawer when it opens.
watch(() => props.open, async (open) => {
  if (!open) return
  await nextTick()
  body.value
    ?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled])')
    ?.focus({ preventScroll: true })
})

const style = computed(() => ({
  width: `${props.width}px`,
  transform: `translateX(${props.open ? '0' : props.side === 'left' ? '-100%' : '100%'})`,
  visibility: props.open ? 'visible' as const : 'hidden' as const,
  transition: `transform .32s cubic-bezier(.2,.7,.2,1), visibility 0s ${props.open ? '0s' : '.32s'}`
}))
</script>

<template>
  <aside
    :id="id"
    :aria-labelledby="`${id}-title`"
    :inert="!open"
    class="absolute inset-y-0 z-10 box-border flex max-w-full flex-col border-bp-edge bg-(--bp-glass-tint) text-bp-text backdrop-blur-[28px] backdrop-brightness-[.85] backdrop-saturate-[1.6]"
    :class="side === 'left' ? 'bp-glass-edge-left left-0 border-r' : 'bp-glass-edge-right right-0 border-l'"
    :style="style"
  >
    <div class="flex h-18 shrink-0 items-center justify-between border-b border-bp-hairline pr-4 pl-6">
      <h2
        :id="`${id}-title`"
        class="font-mono text-xs font-medium tracking-[0.18em]"
      >
        {{ title }}
      </h2>
      <button
        type="button"
        :aria-label="closeLabel"
        class="flex size-10 items-center justify-center border border-bp-control text-bp-text"
        @click="$emit('close')"
      >
        <BlueprintGlyph
          name="close"
          :size="12"
        />
      </button>
    </div>
    <div
      ref="body"
      class="flex grow flex-col overflow-y-auto p-6"
    >
      <slot />
    </div>
    <slot name="footer" />
  </aside>
</template>
