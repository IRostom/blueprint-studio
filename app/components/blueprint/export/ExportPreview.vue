<script setup lang="ts">
import { buildBlueprintSvg } from '~/utils/blueprint/svg'

const store = useBlueprintStore()

const BOX_W = 332
const BOX_H = 200

const preview = computed(() => {
  const { width, height, bleed } = store.canvas
  const k = Math.min(BOX_W / width, BOX_H / height)
  return {
    k,
    width: width * k,
    height: height * k,
    trimInset: bleed * k,
    svg: buildBlueprintSvg({
      mode: 'sheet',
      widthUnits: width,
      heightUnits: height,
      pxPerUnit: k,
      state: store.design,
      bleed,
      unit: 'px',
      minStrokePx: 0.5,
      idPrefix: 'bp-preview'
    })
  }
})

const isPrint = computed(() => store.export.target === 'print')
const dims = computed(() => isPrint.value
  ? `${store.canvas.width} × ${store.canvas.height} mm`
  : `${store.export.width} × ${store.export.height} px`)
const note = computed(() => isPrint.value
  ? `trim ${store.export.width} × ${store.export.height} · bleed ${store.canvas.bleed}`
  : 'fits screen')
</script>

<template>
  <section
    class="flex flex-col gap-2.5"
    aria-label="Preview"
  >
    <div class="flex h-56 items-center justify-center border border-bp-hairline bg-black/18">
      <div
        class="relative overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
        :style="{ width: `${preview.width}px`, height: `${preview.height}px` }"
      >
        <!-- eslint-disable vue/no-v-html -- SVG is built locally from store numbers and validated hex colours -->
        <div
          class="[&>svg]:block"
          v-html="preview.svg"
        />
        <!-- eslint-enable vue/no-v-html -->
        <span
          v-if="isPrint && preview.trimInset > 0"
          class="pointer-events-none absolute border border-dashed border-bp-trim"
          :style="{ inset: `${preview.trimInset}px` }"
        />
      </div>
    </div>
    <div class="flex justify-between font-mono text-[11px] text-bp-muted">
      <span>{{ dims }}</span>
      <span>{{ note }}</span>
    </div>
  </section>
</template>
