<script setup lang="ts">
import type { Drawer } from '~/stores/blueprint'

const store = useBlueprintStore()

const editFab = useTemplateRef<{ focus: () => void }>('editFab')
const exportFab = useTemplateRef<{ focus: () => void }>('exportFab')
const root = useTemplateRef<HTMLElement>('root')

const cssVars = computed(() => ({
  '--bp-bg': store.colors.bg,
  '--bp-major': store.colors.major,
  '--bp-minor': store.colors.minor,
  '--bp-plus': store.colors.plus,
  '--bp-ruler': store.colors.ruler,
  'backgroundColor': store.colors.bg
}))

// Return focus to the Edit/Export button when its drawer closes from inside.
function watchDrawer(open: () => boolean, which: Drawer) {
  watch(open, (isOpen) => {
    if (isOpen) return
    const drawer = document.getElementById(`bp-${which}-drawer`)
    if (drawer?.contains(document.activeElement)) {
      (which === 'edit' ? editFab : exportFab).value?.focus()
    }
  })
}
watchDrawer(() => store.editOpen, 'edit')
watchDrawer(() => store.exportOpen, 'export')

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && (store.editOpen || store.exportOpen)) {
    e.preventDefault()
    store.closeDrawers()
  }
}

// Ctrl + wheel zooms the grid instead of the page.
function onWheel(e: WheelEvent) {
  if (!e.ctrlKey) return
  e.preventDefault()
  store.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1)
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  root.value?.addEventListener('wheel', onWheel, { passive: false })
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  root.value?.removeEventListener('wheel', onWheel)
})
</script>

<template>
  <div
    ref="root"
    data-bp-root
    class="relative h-dvh min-h-140 w-full overflow-hidden font-sans text-bp-text"
    :style="cssVars"
  >
    <BlueprintCanvas />

    <BlueprintFab
      ref="editFab"
      side="left"
      label="Edit"
      icon="edit"
      controls="bp-edit-drawer"
      :expanded="store.editOpen"
      @click="store.openDrawer('edit')"
    />
    <BlueprintFab
      ref="exportFab"
      side="right"
      label="Export"
      icon="download"
      controls="bp-export-drawer"
      :expanded="store.exportOpen"
      @click="store.openDrawer('export')"
    />

    <BlueprintZoom />
    <BlueprintSpec />

    <BlueprintDrawer
      id="bp-edit-drawer"
      side="left"
      :width="360"
      :open="store.editOpen"
      title="EDIT BLUEPRINT"
      close-label="Close edit panel"
      @close="store.closeDrawers()"
    >
      <BlueprintEditPanel />
      <template #footer>
        <div class="flex items-center justify-between border-t border-bp-hairline px-6 py-4">
          <button
            type="button"
            class="h-10 border border-bp-control bg-transparent px-3.5 text-[13px] text-bp-text"
            @click="store.resetDesign()"
          >
            Reset
          </button>
          <span class="font-mono text-[11px] text-bp-muted">Ctrl + scroll to zoom</span>
        </div>
      </template>
    </BlueprintDrawer>

    <BlueprintDrawer
      id="bp-export-drawer"
      side="right"
      :width="380"
      :open="store.exportOpen"
      title="EXPORT"
      close-label="Close export panel"
      @close="store.closeDrawers()"
    >
      <BlueprintExportPanel />
      <template #footer>
        <BlueprintExportFooter />
      </template>
    </BlueprintDrawer>
  </div>
</template>
