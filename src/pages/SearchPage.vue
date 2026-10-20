<template>
  <div class="search-page container q-px-md q-py-lg">
    <h1 class="search-page__title text-h4">{{ term ? t('Results for “{q}”', { q: term }) : t('Search') }}</h1>

    <form class="search-page__form" role="search" @submit.prevent="submit">
      <input v-model="draft" type="search" class="search-page__input" :placeholder="t('Search…')" :aria-label="t('Search')" maxlength="100" enterkeyhint="search">
      <q-btn type="submit" unelevated no-caps color="secondary" :label="t('Search')" />
    </form>

    <p v-if="term.length === 1" class="search-page__note">{{ t('Type at least 2 letters.') }}</p>
    <div v-else-if="loading" class="q-pa-xl flex justify-center"><q-spinner color="secondary" size="3em" /></div>
    <template v-else-if="term">
      <p v-if="!count" class="search-page__note">{{ t('No results for “{q}”', { q: term }) }}</p>

      <div v-if="results.categories.length" class="search-page__group">
        <h2 class="search-page__h2 text-h6">{{ t('Categories') }}</h2>
        <div class="search-page__chips">
          <router-link v-for="c in results.categories" :key="c.id" :to="`/product-category/${c.slug}`" class="search-page__chip">
            {{ c.name }} <small v-if="c.count">({{ c.count }})</small>
          </router-link>
        </div>
      </div>

      <div v-if="results.products.length" class="search-page__group">
        <h2 class="search-page__h2 text-h6">{{ t('Products') }}</h2>
        <ProductResultsGrid :products="results.products" :priority-count="0" :card="productCard" />
        <router-link v-if="results.totals.products > results.products.length" :to="{ path: '/products', query: { q: term } }" class="search-page__more">
          {{ t('See all {n} products', { n: results.totals.products }) }} →
        </router-link>
      </div>

      <div v-if="results.posts.length" class="search-page__group">
        <h2 class="search-page__h2 text-h6">{{ t('Blog posts') }}</h2>
        <div class="search-page__posts">
          <BlogCard v-for="post in results.posts" :key="post.id || post.slug" :post="post" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * /search?q=…&in=products,categories,posts — the Search block's "See all
 * results" (and Enter). Shows the kinds of results the block asked for
 * (products when none). Loaded in the browser; never indexed.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMeta } from 'quasar'
import ProductResultsGrid from 'src/components/shop/ProductResultsGrid.vue'
import BlogCard from 'src/components/blog/BlogCard.vue'
import { search, searchTypes } from 'src/api/search.js'
import { loadPageConfig } from 'src/utils/config-loader.js'
import { useSeoMeta } from 'src/composables/useSeo.js'
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
useSeoMeta({ noindex: true })

const term = computed(() => String(route.query.q || '').trim().slice(0, 100))
const types = computed(() => searchTypes(route.query.in))
const draft = ref(term.value)
useMeta(() => ({ title: term.value ? t('Results for “{q}”', { q: term.value }) : t('Search') }))
const loading = ref(false)
const results = ref({ products: [], categories: [], posts: [], totals: { products: 0, posts: 0 } })
const productCard = ref(null)
const count = computed(() => results.value.products.length + results.value.categories.length + results.value.posts.length)

let controller = null
async function load() {
  draft.value = term.value
  controller?.abort()
  if (term.value.length < 2) {
    results.value = { products: [], categories: [], posts: [], totals: { products: 0, posts: 0 } }
    return
  }
  controller = new AbortController()
  const mine = controller
  loading.value = true
  const found = await search(term.value, types.value, 24, mine.signal)
  if (mine !== controller) return
  results.value = found
  loading.value = false
}

function submit() {
  const q = draft.value.trim()
  if (q) router.push({ path: '/search', query: { q, in: types.value.join(',') } })
}

onMounted(async () => {
  load()
  // The product card design the shop uses (Store builder → Loop templates).
  const shop = await loadPageConfig('shop').catch(() => null)
  productCard.value = Array.isArray(shop?.product_card) ? shop.product_card : null
})
watch(() => route.fullPath, () => { if (route.path.endsWith('/search')) load() })
</script>

<style scoped>
.search-page { max-width: 1200px; margin: 0 auto; }
.search-page__title { margin: 0 0 16px; }
.search-page__form { display: flex; gap: 8px; max-width: 560px; margin: 0 0 24px; }
.search-page__input {
  flex: 1;
  min-width: 0;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
}
.search-page__note { opacity: .75; }
.search-page__group { margin: 0 0 32px; }
.search-page__h2 { margin: 0 0 12px; }
.search-page__chips { display: flex; flex-wrap: wrap; gap: 8px; }
.search-page__chip {
  padding: 8px 14px;
  border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
  border-radius: 99px;
  color: inherit;
  text-decoration: none;
}
.search-page__chip:hover { background: color-mix(in srgb, currentColor 6%, transparent); }
.search-page__more { display: inline-block; margin-top: 12px; font-weight: 600; color: inherit; }
.search-page__posts { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
</style>
