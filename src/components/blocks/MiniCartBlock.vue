<script setup>
/**
 * Mini Cart (header widget): the cart button. It opens the cart drawer (which
 * exists only while this widget is on the page, see useDrawers.js) or goes
 * to the cart page, and can show the cart's total and hide while empty, or on the
 * cart and checkout pages (button and drawer both: the page itself shows the cart).
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import cart from 'stores/cart.js'
import WidgetButton from './WidgetButton.vue'
import { cartIcons } from 'src/utils/builder-icons.js'
import { formatCurrency } from 'src/utils/formatters.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { drawerLook, drawerSections, useDrawer, useDrawerSource } from 'src/composables/useDrawers.js'
import { useI18n } from 'src/i18n/index.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
  page: { type: String, default: '' },
})

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const d = computed(() => props.data?.data || {})
const toPage = computed(() => d.value.click_action === 'page')
// "Hide on the cart and checkout pages" (a language prefix like /en/ may come first).
const onCartPages = computed(() => !!d.value.hide_on_cart_pages && /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:cart|checkout)(?:\/|$)/i.test(route.path || ''))

const source = useDrawerSource(props)
// Its button: the drawer counts only while that button is shown (for swipes).
const openerEl = ref(null)
const drawer = useDrawer(
  () => (toPage.value || onCartPages.value ? '' : 'cart'),
  () => {
    // Its own drawer, or with "Same as another widget" that widget's.
    const node = source.value.node
    const sd = node.data || {}
    return {
      kind: 'cart',
      blockId: source.value.id,
      sections: drawerSections(node),
      width: sd.drawer_width || '',
      title: sd.drawer_title ?? t('Cart'),
      bg: resolveGlobalColor(sd.drawer_bg) || '',
      color: resolveGlobalColor(sd.drawer_text_color) || '',
      look: drawerLook(sd),
      swipe: sd.swipe || 'auto',
    }
  },
  () => openerEl.value,
)

// The cart is known in the browser only: the server's page and the first
// render agree (a button hidden while empty starts hidden).
const ready = ref(false)
onMounted(() => { ready.value = true })
const count = computed(() => (ready.value ? cart.state.items_count || 0 : 0))
const hidden = computed(() => onCartPages.value || (!!d.value.hide_when_empty && count.value === 0))
const total = computed(() => {
  const totals = cart.state.totals || {}
  return formatCurrency(totals.total_price ?? totals.total_items ?? '0')
})

function open() {
  const wasOpen = drawer.isOpen()
  drawer.toggle()
  // No drawer (it couldn't be created): the cart page instead.
  if (!wasOpen && !drawer.isOpen()) router.push('/cart')
}
</script>

<template>
  <WidgetButton
      v-if="!hidden"
      ref="openerEl"
      :d="d"
      :icons="cartIcons"
      :default-icon="cartIcons.cart"
      :count="count"
      :to="toPage ? '/cart' : ''"
      :aria-label="t('View cart')"
      action="cart"
      :expanded="toPage ? null : drawer.isOpen()"
      @click="open"
  >
    <template v-if="d.show_total && count > 0" #extra>
      <span class="mini-cart__total">{{ total }}</span>
    </template>
  </WidgetButton>
</template>
