<script setup>
/**
 * Mini Wishlist (header widget): the wishlist button, which opens the wishlist
 * drawer (it exists only while this widget is on the page, see useDrawers.js).
 */
import { computed, onMounted, ref } from 'vue'
import wishlist from 'stores/wishlist.js'
import WidgetButton from './WidgetButton.vue'
import { wishlistIcons } from 'src/utils/builder-icons.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { useDrawer } from 'src/composables/useDrawers.js'
import { useI18n } from 'src/i18n/index.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
  page: { type: String, default: '' },
})

const { t } = useI18n()
const d = computed(() => props.data?.data || {})

const drawer = useDrawer(
  () => 'wishlist',
  () => ({
    kind: 'wishlist',
    title: d.value.drawer_title ?? t('Wishlist'),
    bg: resolveGlobalColor(d.value.drawer_bg) || '',
    color: resolveGlobalColor(d.value.drawer_text_color) || '',
    swipe: d.value.swipe || 'none',
  }),
)

// Saved in the browser only: the server's page and the first render agree.
const ready = ref(false)
onMounted(() => { ready.value = true })
const count = computed(() => (ready.value ? Object.keys(wishlist.state.items || {}).length : 0))
const hidden = computed(() => !!d.value.hide_when_empty && count.value === 0)
</script>

<template>
  <WidgetButton
      v-if="!hidden"
      :d="d"
      :icons="wishlistIcons"
      :default-icon="wishlistIcons.heart_outline"
      :count="count"
      :aria-label="t('Wishlist')"
      action="wishlist"
      @click="drawer.toggle()"
  />
</template>
