<template>
  <section :style="cssVars" v-if="categories?.length" class="category-grid-section">
    <div class="container">
      <h2 v-if="data.title" class="q-mb-lg text-center" v-html="sanitizeSectionText(data.title)" />
      <div class="row q-col-gutter-md">
        <div v-for="cat in categories" :key="cat.id" class="col-6 col-md-3">
          <q-btn flat no-caps :to="`/product-category/${cat.slug}`" class="category-grid-card">
            <div class="absolute-full bg-black" style="opacity: 0.2; z-index: 1"></div>
            <img v-if="cat.image" :src="cat.image" :alt="cat.name" loading="lazy" />
            <span class="category-name text-h6 absolute">{{ cat.name }}</span>
          </q-btn>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
// `data` is this section's raw config exactly as saved by WP (category_ids,
// title) — passed straight through from home.json via SectionRenderer with
// no page-level resolution. Resolving category_ids into real category
// objects (name/slug/image) is this component's own job.
//
// Uses the WC Store API directly since there isn't an id-scoped categories
// store yet — if you add one later (mirroring productsStore), swap the
// fetch below for it, the same way getFeaturedProducts is used for products.
import {computed, onMounted, onServerPrefetch, useSSRContext} from 'vue'
import { useSectionData } from 'src/composables/useSectionData.js'
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'
import { getApiOrigin } from 'src/utils/server/get-api-origin.js'

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  sectionId: {
    type: String,
    required: true
  },
  sectionBg: {
    type: String,
    required: true,
    default: ''
  }
})

const resolveSectionBg = (bg) => {
  if (!bg) return ''
  const map = {
    'global:primary': 'var(--q-primary)',
    'global:secondary': 'var(--q-secondary)',
    'global:accent': 'var(--q-accent)',
    'global:text': 'var(--q-text)'
  }
  return map[bg] || bg
}

const cssVars = computed(() => {
  const vars = {}
  const resolvedBg = resolveSectionBg(props.sectionBg)
  if (resolvedBg) {
    vars['--section-bg'] = resolvedBg
  }
  return vars
})

async function fetchCategories(ids, ssrContext) {
  if (!ids?.length) return []

  try {
    const res = await fetch(
        `${getApiOrigin(ssrContext)}/wp-json/wc/store/v1/products/categories?include=${ids.join(',')}`
    )

    if (!res.ok) throw new Error(`API error: ${res.status}`)

    const json = await res.json()
    return (Array.isArray(json) ? json : []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      image: cat.image?.src || ''
    }))
  } catch (err) {
    console.error('[CategoryGridSection] failed to resolve categories', err)
    return []
  }
}

const { data: categories, resolve } = useSectionData(props.sectionId, (ssrContext) =>
    fetchCategories(props.data.category_ids || [], ssrContext)
)

let ssrContext = null
if (process.env.SERVER) {
  ssrContext = useSSRContext()
}

onServerPrefetch(async () => {
  await resolve(ssrContext)
})

onMounted(async () => {
  if (categories.value === null) {
    await resolve(null)
  }
})
</script>

<style scoped>
.category-grid-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
}
.category-grid-card .category-name {
  transition: 0.3s ease
}

.category-grid-card:hover .category-name {
  transform: scale(1.1);
}

.category-grid-card img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: inherit;
}
</style>