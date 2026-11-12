<template>
    <q-scroll-area class="fit q-pa-sm">

    <div>
      <div class="sticky wishlist-drawer-header flex justify-between q-mb-md">
        <div v-if="title !== ''" class="text-h6">{{ title ?? t('Wishlist') }}</div><span v-else />
        <q-btn flat dense :aria-label="t('Close wishlist drawer')" padding="none" :icon="matClose" @click="emit('toggle-wishlist')"/>
      </div>
      <div v-if="wishlist.state.items && wishlist.state.items.length === 0" class="text-center text-grey">
      {{ t('Your wishlist is empty.') }}
      </div>
      <div v-else-if="wishlist.state.items && wishlist.state.items.length > 0" v-for="product in wishlist.state.items" :key="product.id" class="relative-position q-pa-sm row full-width">
        <router-link :to="`/product/${product.slug}/`" class="flex no-wrap q-pr-lg no-decoration text-secondary full-width">
          <img :src="product?.image || '/naturaBloom-circle.svg'" :alt="product.name" style="width: 70px; height: 70px; object-fit: cover" />
          <div class="q-ml-sm column items-start">
            <div>{{ product.name }}</div>
            <!-- A plain button inside the link: it never follows the link itself. -->
            <q-btn :label="needsChoice(product) ? t('Choose options') : t('Add to Cart')" color="secondary" :loading="adding === product.id" @click.prevent.stop="addToCart(product)" />
          </div>
        </router-link>
        <q-btn class="absolute absolute-top-right" :icon="matClose" flat @click.stop.prevent="removeFromWishlist(product.id)" />

      </div>

    </div>
    </q-scroll-area>

</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import cart from 'src/stores/cart.js'
import wishlist from 'src/stores/wishlist.js'
import { matClose } from '@quasar/extras/material-icons'
import { addsDirectly, wishlistProducts } from 'src/utils/wishlist-cart.js'
import { canQuickChoose, openQuickOptions } from 'src/composables/useQuickOptions.js'

defineProps({
  // The widget's drawer title (null: the default; '': no title).
  title: { type: String, default: null },
})

const emit = defineEmits([
  'toggle-wishlist',
])

// Saved items keep only a name and a picture: whether a product has options to choose (and what
// they are) comes from the store, in the browser, once the drawer is on the page.
const router = useRouter()
const products = ref([])
const mounted = ref(false)
const ids = computed(() => (wishlist.state.items || []).map((i) => Number(i.id)).join(','))
async function loadProducts() {
  products.value = ids.value ? await wishlistProducts() : []
  return products.value
}
onMounted(() => { mounted.value = true })
watch([mounted, ids], () => { if (mounted.value) loadProducts() }, { immediate: true })
const storeProduct = (saved) => products.value.find((p) => Number(p.id) === Number(saved.id)) || null
const needsChoice = (saved) => {
  const p = storeProduct(saved)
  return !!p && !addsDirectly(p)
}

// A product with options is never added without them: they're chosen in the popup
// (QuickOptions.vue); a product the popup can't show opens its page.
const adding = ref(0)
async function addToCart(saved) {
  if (adding.value) return
  adding.value = saved.id
  try {
    const p = storeProduct(saved) || (await loadProducts()).find((x) => Number(x.id) === Number(saved.id)) || null
    if (p && addsDirectly(p)) return await cart.add(p.id, 1, null, {}, null, p)
    if (p && canQuickChoose(p)) return openQuickOptions(p)
    await router.push(`/product/${saved.slug}/`)
  } finally {
    adding.value = 0
  }
}

async function removeFromWishlist(id) {
  try {
    await wishlist.toggleWishlistItem(id)
  } catch (err) {
    console.error('Error removing from wishlist:', err)
  }
}
</script>
