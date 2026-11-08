<template>
  <!-- The wishlist is saved in the browser: drawn after this block mounts. -->
  <div v-if="ready" class="wli" :style="vars">
    <div v-if="!items.length" class="wli__empty">{{ d.empty_text || t('Your wishlist is empty.') }}</div>
    <div v-for="item in items" :key="item.id" class="wli__item">
      <router-link :to="item.to" class="wli__img no-decoration" :aria-label="item.name">
        <img :src="item.image || '/naturaBloom-circle.svg'" alt="" loading="lazy" width="70" height="70">
      </router-link>
      <div class="wli__info">
        <router-link :to="item.to" class="wli__name no-decoration" v-bind="nameText">{{ item.name }}</router-link>
        <!-- The store's price, escaped by formatStoreAmount. -->
        <div v-if="d.show_price !== false && item.price" class="wli__price" v-html="item.price" />
        <q-btn
            v-if="d.show_add !== false"
            class="wli__add"
            color="secondary"
            size="sm"
            unelevated
            no-caps
            :loading="adding === item.id"
            :label="item.direct ? (d.add_label || t('Add to Cart')) : t('Choose options')"
            @click="add(item)"
        />
      </div>
      <q-btn class="wli__remove" flat round dense size="sm" :icon="matClose" :aria-label="t('Remove {name} from the wishlist', { name: item.name })" @click="remove(item.id)" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { matClose } from '@quasar/extras/material-icons'
import cart from 'src/stores/cart.js'
import wishlist from 'src/stores/wishlist.js'
import { addsDirectly, wishlistProducts } from 'src/utils/wishlist-cart.js'
import { formatStoreAmount } from 'src/utils/formatters.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { toCssLength } from 'src/composables/useSectionStyle.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { isEditorMode } from 'src/utils/config-loader.js'
import { sampleProducts } from 'src/utils/sample-items.js'
import { t } from 'src/i18n/index.js'

/**
 * "Wishlist Items": the products the shopper saved, with Add to cart (or "Choose
 * options" for products with sizes or colours) and remove. The Store builder's
 * preview of an empty wishlist shows sample products.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const d = computed(() => props.data.data || {})
const router = useRouter()

const ready = ref(false)
const editor = ref(false)
const products = ref([]) // the store's data for the saved products
onMounted(() => {
  ready.value = true
  editor.value = isEditorMode()
})
const ids = computed(() => (wishlist.state.items || []).map((i) => Number(i.id)).join(','))
watch([ready, ids], async () => {
  if (!ready.value) return
  products.value = ids.value ? await wishlistProducts() : []
}, { immediate: true })

const pathOf = (p) => {
  try {
    return p?.permalink ? new URL(p.permalink, 'http://x').pathname : ''
  } catch {
    return ''
  }
}
const items = computed(() => {
  const saved = wishlist.state.items || []
  if (!saved.length && editor.value) {
    return sampleProducts(2).map((p) => ({ id: p.id, name: p.name, image: p.images?.[0]?.src || '', price: formatStoreAmount(p.prices, p.prices?.price), to: '', direct: true, sample: true }))
  }
  const byId = new Map(products.value.map((p) => [Number(p.id), p]))
  return saved.map((s) => {
    const p = byId.get(Number(s.id))
    const image = p?.images?.[0]?.thumbnail || p?.images?.[0]?.src || s.image || s.images?.[0]?.thumbnail || ''
    return {
      id: Number(s.id),
      name: p?.name || s.name || '',
      image,
      price: p?.prices ? formatStoreAmount(p.prices, p.prices.price) : '',
      to: pathOf(p) || s.slug || '',
      direct: p ? addsDirectly(p) : false,
      product: p || null,
    }
  })
})

const adding = ref(0)
async function add(item) {
  if (item.sample) return
  if (!item.direct) {
    if (item.to) await router.push(item.to)
    return
  }
  adding.value = item.id
  try {
    await cart.add(item.id, 1, null, {}, null, item.product, true)
  } finally {
    adding.value = 0
  }
}
async function remove(id) {
  if (items.value.find((i) => i.id === id)?.sample) return
  await wishlist.toggleWishlistItem(id).catch(() => {})
}

const nameText = computed(() => textStyle(d.value, tsKeys('name')))
const vars = computed(() => {
  const v = {}
  const size = toCssLength(d.value.image_size)
  if (size) v['--wli-img'] = size
  const line = resolveGlobalColor(d.value.divider_color)
  if (line) v['--wli-line'] = line
  return v
})
</script>

<style scoped>
.wli { display: grid; }
.wli__empty { padding: 8px 0; opacity: 0.75; }
.wli__item { position: relative; display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; }
.wli__item + .wli__item { border-top: 1px solid var(--wli-line, transparent); }
.wli__img img { width: var(--wli-img, 70px); height: var(--wli-img, 70px); object-fit: cover; display: block; border-radius: 6px; }
.wli__info { flex: 1; min-width: 0; display: grid; gap: 4px; justify-items: start; padding-inline-end: 28px; }
.wli__name { color: inherit; font-weight: 600; }
.wli__add { margin-top: 4px; }
.wli__remove { position: absolute; top: 6px; inset-inline-end: 0; }
</style>
