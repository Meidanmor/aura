<template>
    <div :style="cssVars" v-if="categories?.length" class="container category-grid-section">
      <h2 v-if="props.data.data.title" class="q-mb-lg text-center" v-html="sanitizeSectionText(props.data.data.title)" />
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
import {computed, onMounted, onServerPrefetch, useSSRContext, watch} from 'vue'
import { useSectionData } from 'src/composables/useSectionData.js'
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'
import { getApiOrigin } from 'src/utils/server/get-api-origin.js'

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  blockId: {
    type: String,
    required: true
  }
})

const cssVars = computed(() => {
  const vars = {}
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

const { data: categories, resolve } = useSectionData(props.blockId, (ssrContext) =>
    fetchCategories(props.data.data.category_ids || [], ssrContext)
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

// Live preview: re-resolve when the admin changes the picked categories.
watch(
    () => (props.data.data.category_ids || []).join(','),
    async (next, prev) => {
      if (next !== prev) await resolve(null)
    }
)
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