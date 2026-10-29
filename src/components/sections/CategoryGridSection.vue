<template>
    <div :style="cssVars" v-if="categories?.length" class="container category-grid-section">
      <h2 v-if="props.data.data.title" class="q-mb-lg text-center" v-html="sanitizeSectionText(props.data.data.title)" />
      <div class="category-grid">
        <div v-for="cat in categories" :key="cat.id" class="category-grid__cell">
          <LoopCard v-if="card" :sections="card" type="category" :item="cat" />
          <q-btn v-else flat no-caps :to="`/product-category/${cat.slug}`" class="category-grid-card">
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
import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'
import LoopCard from '../loops/LoopCard.vue'

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

// A card design chosen for this block (Store builder → Card designs), published with it.
const card = computed(() => (Array.isArray(props.data.data?.card) && props.data.data.card.length ? props.data.data.card : null))

// Categories per row and the gap between them (columns default to 4 / 2 / 2, as before).
const cssVars = computed(() => {
  const vars = {}
  const d = props.data.data || {}
  setResponsiveVar(vars, '--cg-cols', d.columns || { desktop: 4, tablet: 2, mobile: 2 }, (v) => (v ? Math.max(1, Math.min(6, Number(v))) : null))
  setResponsiveVar(vars, '--cg-gap', d.gap, toCssLength)
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
      image: cat.image?.src || '',
      // For card designs: the full image (srcset), the number of products and the description.
      image_data: cat.image || null,
      count: cat.count ?? null,
      description: cat.description || ''
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
.category-grid {
  display: grid;
  grid-template-columns: repeat(var(--cg-cols, 4), minmax(0, 1fr));
  gap: var(--cg-gap, 16px);
}
@media (min-width: 768px) and (max-width: 1023px) {
  .category-grid { grid-template-columns: repeat(var(--cg-cols-t, var(--cg-cols, 2)), minmax(0, 1fr)); gap: var(--cg-gap-t, var(--cg-gap, 16px)); }
}
@media (max-width: 767px) {
  .category-grid { grid-template-columns: repeat(var(--cg-cols-m, var(--cg-cols-t, var(--cg-cols, 2))), minmax(0, 1fr)); gap: var(--cg-gap-m, var(--cg-gap-t, var(--cg-gap, 16px))); }
}
.category-grid__cell { min-width: 0; }
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