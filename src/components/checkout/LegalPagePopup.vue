<template>
  <!-- The checkout's Terms / Privacy page in a popup: the page's own sections, no header or footer.
       A sheet from the bottom on phones (drag down to close, like Sort's list), a centred window on bigger screens. -->
  <q-dialog v-model="open" :position="phone ? 'bottom' : 'standard'" class="legal-popup-dialog" @hide="$emit('update:path', '')">
    <div class="legal-popup" :class="{ 'is-sheet': phone }" role="document" data-sheet>
      <div v-if="phone" class="legal-popup__grip" aria-hidden="true" v-on="drag"><span /></div>
      <div class="legal-popup__head" v-on="phone ? drag : {}">
        <div class="legal-popup__title">{{ page?.title || '' }}</div>
        <q-btn flat round dense :icon="matClose" :aria-label="t('Close')" @click="open = false" />
      </div>
      <div class="legal-popup__body">
        <SectionRenderer v-if="page" :sections="page.sections" page="custom" />
        <div v-else-if="missing" class="q-pa-lg">{{ t("This page couldn't be loaded.") }} <a :href="path" target="_blank" rel="noopener">{{ t('Open it in a new tab') }}</a></div>
        <div v-else class="q-pa-xl flex flex-center"><q-spinner color="secondary" size="2em" /></div>
      </div>
    </div>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { matClose } from '@quasar/extras/material-icons'
import SectionRenderer from 'components/sections/SectionRenderer.vue'
import { useSheetDrag } from 'src/composables/useSheetDrag.js'
import { useI18n } from 'src/i18n/index.js'

/** v-model:path: the page's address ("/terms"); '' = closed. */
const props = defineProps({ path: { type: String, default: '' } })
const emit = defineEmits(['update:path'])
const { t } = useI18n()
const $q = useQuasar()
const phone = computed(() => $q.screen.lt.sm)
const page = ref(null)
const missing = ref(false)
const open = computed({ get: () => !!props.path, set: (v) => { if (!v) emit('update:path', '') } })
const drag = useSheetDrag(() => { open.value = false })

// Pages already opened stay here: a second look opens at once.
const seen = new Map()
watch(() => props.path, async (path) => {
  if (!path) return
  missing.value = false
  page.value = seen.get(path) || null
  if (page.value) return
  // Loaded on the first open: the page code stays out of the checkout's own files.
  const found = await import('pages/CustomPage.vue').then((m) => m.pageAt(path)).catch(() => null)
  if (props.path !== path) return
  if (found) seen.set(path, found)
  page.value = found
  missing.value = !found
})
</script>

<style>
.legal-popup-dialog { z-index: 10000; }
/* The store's page and text colours (2026-11-26; was white on dark stores). */
.legal-popup { background: var(--q-primary, #fff); color: var(--q-secondary, inherit); width: 760px; max-width: calc(100vw - 32px); max-height: 85vh; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; }
.legal-popup.is-sheet { width: 100%; max-width: 100vw; max-height: 88vh; border-radius: 16px 16px 0 0; padding-bottom: env(safe-area-inset-bottom); }
.legal-popup__grip { display: flex; justify-content: center; padding: 8px 0 2px; touch-action: none; cursor: grab; }
.legal-popup__grip span { width: 40px; height: 4px; border-radius: 4px; background: rgba(0, 0, 0, .2); }
.legal-popup__head { display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 16px; border-bottom: 1px solid rgba(0, 0, 0, .08); border-bottom: 1px solid color-mix(in srgb, currentColor 8%, transparent); }
.legal-popup.is-sheet .legal-popup__head { touch-action: none; }
.legal-popup__title { flex: 1; font-weight: 700; font-size: 17px; }
.legal-popup__body { overflow-y: auto; overscroll-behavior: contain; flex: 1; }
</style>
