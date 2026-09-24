<script setup lang="ts">
import { downloadBlueprint } from '~/utils/blueprint/export'

const store = useBlueprintStore()
const toast = useToast()
const busy = ref(false)

const label = computed(() => `Download ${store.export.format.toUpperCase()}`)

async function download() {
  if (busy.value || store.exceedsLimit) return
  busy.value = true
  // Let the busy state paint before the (synchronous) raster work starts.
  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve)))
  try {
    await downloadBlueprint(store.design, store.export)
  } catch (err) {
    toast.add({
      title: 'Export failed',
      description: err instanceof Error ? err.message : String(err),
      color: 'error'
    })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-3.5 border-t border-bp-hairline px-6 pt-5 pb-6">
    <div class="flex items-baseline justify-between">
      <span
        id="bp-output-label"
        class="font-mono text-[11px] tracking-[0.16em] text-bp-muted"
      >OUTPUT</span>
      <output
        aria-labelledby="bp-output-label"
        class="font-mono text-[15px] font-medium"
      >{{ store.outputLabel }}</output>
    </div>
    <p
      v-if="store.exceedsLimit"
      role="alert"
      class="font-mono text-[11px] leading-relaxed text-bp-trim"
    >
      Too large for a browser canvas. Pick a lower resolution or export SVG.
    </p>
    <button
      type="button"
      :disabled="busy || store.exceedsLimit"
      :aria-busy="busy"
      class="flex h-12 items-center justify-center gap-2.5 bg-bp-text text-sm font-semibold text-bp-selected-text disabled:cursor-not-allowed disabled:opacity-50"
      @click="download"
    >
      <BlueprintGlyph
        name="download"
        :stroke-width="1.6"
      />
      {{ busy ? 'Rendering…' : label }}
    </button>
  </div>
</template>
