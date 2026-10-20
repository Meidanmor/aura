<template>
  <div class="sr" :id="listId">
    <p v-if="loading && !count" class="sr-note">{{ t('Searching…') }}</p>
    <p v-else-if="!count" class="sr-note">{{ t('No results for “{q}”', { q }) }}</p>
    <template v-else>
      <div v-if="results.categories.length" class="sr-group">
        <h3 class="sr-title">{{ t('Categories') }}</h3>
        <router-link
            v-for="(c, i) in results.categories"
            :key="`c${c.id}`"
            :to="`/product-category/${c.slug}`"
            class="sr-item"
            :class="{ active: active === offsets.categories + i }"
            :data-sr-index="offsets.categories + i"
            @click="emit('pick')"
        >
          <span class="sr-name">{{ c.name }}</span>
          <small v-if="c.count" class="sr-sub">{{ tn('{n} product', '{n} products', c.count) }}</small>
        </router-link>
      </div>
      <div v-if="results.products.length" class="sr-group">
        <h3 class="sr-title">{{ t('Products') }}</h3>
        <router-link
            v-for="(p, i) in results.products"
            :key="`p${p.id}`"
            :to="productPath(p)"
            class="sr-item"
            :class="{ active: active === offsets.products + i }"
            :data-sr-index="offsets.products + i"
            @click="emit('pick')"
        >
          <img v-if="p.images?.[0]?.thumbnail || p.images?.[0]?.src" :src="p.images[0].thumbnail || p.images[0].src" alt="" class="sr-thumb" loading="lazy" decoding="async" width="44" height="44" />
          <span v-else class="sr-thumb" aria-hidden="true" />
          <span class="sr-name">{{ decode(p.name) }}</span>
          <!-- eslint-disable-next-line vue/no-v-html -- cleaned by sanitizePriceHtml -->
          <small class="sr-sub sr-price" v-html="sanitizePriceHtml(p.price_html)" />
        </router-link>
      </div>
      <div v-if="results.posts.length" class="sr-group">
        <h3 class="sr-title">{{ t('Blog posts') }}</h3>
        <router-link
            v-for="(post, i) in results.posts"
            :key="`b${post.id || post.slug}`"
            :to="`/blog/${post.slug}`"
            class="sr-item"
            :class="{ active: active === offsets.posts + i }"
            :data-sr-index="offsets.posts + i"
            @click="emit('pick')"
        >
          <span class="sr-name">{{ post.title }}</span>
        </router-link>
      </div>
    </template>
    <router-link v-if="q.length >= 2" :to="allTo" class="sr-all" @click="emit('pick')">{{ t('See all results') }} →</router-link>
  </div>
</template>

<script setup>
/**
 * The results under a Search block while typing: categories, products and
 * posts (whichever the block shows), and a link to the search page.
 * `active` is the item chosen with the arrow keys (numbered in that order).
 */
import { computed } from 'vue'
import { productPath } from 'src/api/search.js'
import { sanitizePriceHtml } from 'src/utils/sanitizeHtml'
import { useI18n } from 'src/i18n/index.js'

const props = defineProps({
  results: { type: Object, required: true },
  q: { type: String, default: '' },
  types: { type: Array, default: () => ['products'] },
  loading: { type: Boolean, default: false },
  active: { type: Number, default: -1 },
  listId: { type: String, default: undefined },
})
const emit = defineEmits(['pick'])
const { t, tn } = useI18n()

const count = computed(() => props.results.categories.length + props.results.products.length + props.results.posts.length)
const offsets = computed(() => ({
  categories: 0,
  products: props.results.categories.length,
  posts: props.results.categories.length + props.results.products.length,
}))
const allTo = computed(() => ({ path: '/search', query: { q: props.q, in: props.types.join(',') } }))

// Store API names come HTML-escaped (&amp;).
function decode(s) {
  return String(s || '').replace(/&amp;/g, '&').replace(/&#0?39;|&#8217;/g, '’').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}
</script>

<style scoped>
.sr { display: flex; flex-direction: column; gap: 4px; padding: 8px; max-height: min(70vh, 520px); overflow-y: auto; }
.sr-note { margin: 8px; opacity: .7; font-size: 14px; }
.sr-group { display: flex; flex-direction: column; }
.sr-group + .sr-group { margin-top: 6px; padding-top: 6px; border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent); }
.sr-title { margin: 4px 8px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; opacity: .6; }
.sr-item { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 8px; color: inherit; text-decoration: none; min-width: 0; }
.sr-item:hover, .sr-item:focus-visible, .sr-item.active { background: color-mix(in srgb, currentColor 7%, transparent); outline: none; }
.sr-thumb { width: 44px; height: 44px; flex: none; border-radius: 6px; object-fit: cover; background: color-mix(in srgb, currentColor 6%, transparent); }
.sr-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
.sr-sub { flex: none; font-size: 12.5px; opacity: .75; }
.sr-price :deep(del) { opacity: .6; margin-inline-end: 4px; }
.sr-price :deep(ins) { text-decoration: none; }
.sr-all { margin: 6px 8px 2px; font-size: 13.5px; font-weight: 600; color: inherit; }
</style>
