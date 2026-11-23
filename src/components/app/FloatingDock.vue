<template>
  <!-- "Back to place" for buttons the shopper moved (floating-dock.js). Phones: a small round icon on each moved
       button's inner top corner, half on it and half outside, for as long as it's moved; computers: a labelled
       chip beside the button for a few seconds after the move. -->
  <button
      v-for="b in badges"
      :key="b.id"
      type="button"
      class="dock-back a11y-ui"
      :class="{ 'dock-back--chip': !dock.phone }"
      :style="b.style"
      :aria-label="t('Put the button back in its place')"
      :title="t('Put the button back in its place')"
      data-dock
      @click="dockReset(b.id)"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v5h5" /></svg>
    <span v-if="!dock.phone">{{ t('Back to place') }}</span>
  </button>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'src/i18n/index.js'
import { dock, dockReset, initDock } from 'src/utils/floating-dock.js'

const { t } = useI18n()
const BADGE = 26

const badges = computed(() => {
  if (dock.dragging) return []
  const { size, edge } = dock.cfg
  const ids = dock.phone ? Object.keys(dock.moved) : (dock.badge ? [dock.badge] : [])
  return ids.filter((id) => dock.pos[id]).map((id) => {
    const p = dock.pos[id]
    const inner = p.side
    const style = dock.phone
      // Centred on the button's top corner that faces the middle of the screen.
      ? { [inner]: `calc(${edge + size - BADGE / 2 - 4}px + env(safe-area-inset-${inner}, 0px))`, bottom: `calc(${p.bottom + size - BADGE / 2 - 4}px + env(safe-area-inset-bottom, 0px))` }
      : { [inner]: `calc(${edge + size + 10}px + env(safe-area-inset-${inner}, 0px))`, bottom: `calc(${p.bottom + size / 2 - 17}px + env(safe-area-inset-bottom, 0px))` }
    return { id, style }
  })
})

onMounted(initDock)
</script>

<style scoped>
.dock-back {
  position: fixed;
  z-index: 995;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #1d1b22;
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(0, 0, 0, .3);
}
.dock-back svg { width: 14px; height: 14px; }
.dock-back--chip {
  width: auto;
  height: 34px;
  padding: 0 14px 0 10px;
  border: 0;
  border-radius: 99px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font: inherit;
  font-size: 13px;
  white-space: nowrap;
}
.dock-back:focus-visible { outline: 3px solid #000; outline-offset: 2px; box-shadow: 0 0 0 5px #fff; }
@media print { .dock-back { display: none; } }
</style>
