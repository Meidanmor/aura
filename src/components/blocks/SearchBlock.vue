<template>
  <div class="search-block" :class="`search-block--${display}`" :style="vars">
    <!-- An icon that opens a search box over the page. -->
    <template v-if="display === 'icon'">
      <WidgetButton :d="d" :icons="searchIcons" :default-icon="searchIcons.search" :aria-label="t('Search')" @click="openBox" />
      <Teleport v-if="open" to="body">
        <div class="search-overlay" @click.self="close" @keydown.esc="close">
          <div class="search-box" role="dialog" aria-modal="true" :aria-label="t('Search')" :style="panelVars">
            <form class="search-form" role="search" @submit.prevent="goAll">
              <q-icon :name="searchIcons.search" class="search-form__icon" />
              <input ref="input" v-model="q" v-bind="inputAttrs" @keydown="onKey">
              <button type="button" class="search-form__close" :aria-label="t('Close search')" @click="close">✕</button>
            </form>
            <SearchResults v-if="q.trim().length >= 2" :list-id="listId" :results="results" :q="q.trim()" :types="types" :loading="loading" :active="active" @pick="close" />
          </div>
        </div>
      </Teleport>
    </template>

    <!-- A search field in the header (or anywhere), its results under it. -->
    <form v-else ref="root" class="search-form search-form--inline" role="search" @submit.prevent="goAll" @focusout="onFocusOut">
      <q-icon :name="iconName" class="search-form__icon" />
      <input ref="input" v-model="q" v-bind="inputAttrs" @focus="onFocus" @keydown="onKey">
      <div v-if="open && q.trim().length >= 2" class="search-drop" :style="[panelVars, dropSide]">
        <SearchResults :list-id="listId" :results="results" :q="q.trim()" :types="types" :loading="loading" :active="active" @pick="close" />
      </div>
    </form>
  </div>
</template>

<script setup>
/**
 * Search (header widget, or any section): an icon that opens a search box,
 * or a search field. While typing (2+ letters) it shows products, product
 * categories and/or blog posts, as the block chooses (show_products,
 * show_categories, show_posts; max_results of each). Enter, or "See all
 * results", opens /search with the same kinds of results.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WidgetButton from './WidgetButton.vue'
import SearchResults from './SearchResults.vue'
import { search, productPath } from 'src/api/search.js'
import { searchIcons } from 'src/utils/builder-icons.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'
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
const display = computed(() => (d.value.display === 'field' ? 'field' : 'icon'))
const iconName = computed(() => searchIcons[d.value.icon] || searchIcons.search)
const types = computed(() => {
  const list = []
  if (d.value.show_categories) list.push('categories')
  if (d.value.show_products !== false) list.push('products')
  if (d.value.show_posts) list.push('posts')
  return list.length ? list : ['products']
})
const limit = computed(() => Math.max(1, Math.min(10, Number(d.value.max_results) || 5)))
const listId = `sr-${props.blockId || Math.random().toString(36).slice(2, 8)}`

const open = ref(false)
const q = ref('')
const input = ref(null)
const root = ref(null)
const loading = ref(false)
const active = ref(-1)
const empty = () => ({ products: [], categories: [], posts: [], totals: { products: 0, posts: 0 } })
const results = ref(empty())

const inputAttrs = computed(() => ({
  type: 'search',
  class: 'search-form__input',
  placeholder: d.value.placeholder || t('Search…'),
  'aria-label': t('Search'),
  autocomplete: 'off',
  enterkeyhint: 'search',
  role: 'combobox',
  'aria-expanded': open.value && q.value.trim().length >= 2 ? 'true' : 'false',
  'aria-controls': listId,
  maxlength: 100,
}))

const vars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--sb-search-w', d.value.field_width, toCssLength)
  const bg = resolveGlobalColor(d.value.field_bg)
  const text = resolveGlobalColor(d.value.field_text)
  const border = resolveGlobalColor(d.value.field_border)
  if (bg) v['--sb-search-bg'] = bg
  if (text) v['--sb-search-text'] = text
  if (border) v['--sb-search-border'] = border
  const radius = toCssLength(d.value.field_radius)
  if (radius) v['--sb-search-radius'] = radius
  return v
})
const panelVars = computed(() => {
  const v = {}
  const bg = resolveGlobalColor(d.value.panel_bg)
  const text = resolveGlobalColor(d.value.panel_text)
  if (bg) v['--sb-panel-bg'] = bg
  if (text) v['--sb-panel-text'] = text
  return v
})

// Typing: results after a short pause; an older search still running is dropped.
let timer = 0
let controller = null
watch(q, (value) => {
  clearTimeout(timer)
  active.value = -1
  const term = value.trim()
  if (term.length < 2) {
    controller?.abort()
    results.value = empty()
    loading.value = false
    return
  }
  loading.value = true
  timer = setTimeout(async () => {
    controller?.abort()
    controller = new AbortController()
    const mine = controller
    const found = await search(term, types.value, limit.value, mine.signal)
    if (mine !== controller) return
    results.value = found
    loading.value = false
  }, 250)
})

// The results in the order they're shown: where the arrow keys go.
const flat = computed(() => [
  ...results.value.categories.map((c) => `/product-category/${c.slug}`),
  ...results.value.products.map(productPath),
  ...results.value.posts.map((p) => `/blog/${p.slug}`),
])

function onKey(e) {
  if (e.key === 'Escape') return close()
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!flat.value.length) return
    e.preventDefault()
    const n = flat.value.length
    active.value = e.key === 'ArrowDown' ? (active.value + 1) % n : (active.value <= 0 ? n - 1 : active.value - 1)
    nextTick(() => document.querySelector(`#${listId} [data-sr-index="${active.value}"]`)?.scrollIntoView({ block: 'nearest' }))
  }
}

function goAll() {
  const term = q.value.trim()
  if (active.value >= 0 && flat.value[active.value]) {
    router.push(flat.value[active.value])
  } else if (term) {
    router.push({ path: '/search', query: { q: term, in: types.value.join(',') } })
  } else {
    return
  }
  close()
}

async function openBox() {
  open.value = true
  await nextTick()
  input.value?.focus()
}
function close() {
  open.value = false
  active.value = -1
  if (display.value === 'field') input.value?.blur()
}
// The results open toward the side of the screen with more room (a field near the right edge opens leftward).
const dropSide = ref({ left: 0 })
function onFocus() {
  open.value = true
  const box = root.value?.getBoundingClientRect()
  dropSide.value = box && box.left + box.width / 2 > window.innerWidth / 2 ? { right: 0 } : { left: 0 }
}
function onFocusOut(e) {
  // Still inside the field or its results (a click on a result).
  if (root.value && e.relatedTarget && root.value.contains(e.relatedTarget)) return
  setTimeout(() => {
    if (!root.value?.contains(document.activeElement)) open.value = false
  }, 150)
}

// The search box closes when the page changes; the page's scroll stays put while it's open.
watch(() => route.fullPath, () => { open.value = false })
watch(open, (v) => {
  if (display.value !== 'icon' || typeof document === 'undefined') return
  document.documentElement.style.overflow = v ? 'hidden' : ''
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  controller?.abort()
  if (typeof document !== 'undefined' && display.value === 'icon' && open.value) document.documentElement.style.overflow = ''
})
</script>

<style scoped>
.search-block { display: inline-flex; max-width: 100%; }
.search-form { position: relative; display: flex; align-items: center; gap: 8px; }
.search-form__icon { font-size: 18px; opacity: .7; flex: none; }
.search-form__input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 15px;
}
.search-form__input::-webkit-search-cancel-button { cursor: pointer; }

/* A search field */
.search-form--inline {
  width: var(--sb-search-w, 220px);
  max-width: 100%;
  padding: 7px 14px;
  border: 1px solid var(--sb-search-border, color-mix(in srgb, currentColor 25%, transparent));
  border-radius: var(--sb-search-radius, 99px);
  background: var(--sb-search-bg, transparent);
  color: var(--sb-search-text, inherit);
}
.search-form--inline:focus-within { border-color: var(--sb-search-text, currentColor); }
.search-form--inline .search-form__icon { margin-inline-start: -2px; }
.search-form--inline .search-form__input { font-size: 14px; }
@media (max-width: 1023px) { .search-form--inline { width: var(--sb-search-w-t, var(--sb-search-w, 220px)); } }
@media (max-width: 767px) { .search-form--inline { width: var(--sb-search-w-m, var(--sb-search-w-t, var(--sb-search-w, 220px))); } }

.search-drop {
  position: absolute;
  top: calc(100% + 8px);
  z-index: 3000;
  width: max(100%, 340px);
  max-width: calc(100vw - 24px);
  background: var(--sb-panel-bg, var(--q-bg, #fff));
  color: var(--sb-panel-text, var(--q-text, #1a1a1a));
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, .16);
  text-align: start;
}
</style>

<style>
/* The search box opened from the icon (teleported to <body>, so not scoped). */
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 72px 16px 16px;
  background: rgba(0, 0, 0, .35);
}
.search-box {
  width: min(640px, 100%);
  background: var(--sb-panel-bg, var(--q-bg, #fff));
  color: var(--sb-panel-text, var(--q-text, #1a1a1a));
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, .25);
  overflow: hidden;
  text-align: start;
}
.search-box .search-form { padding: 14px 16px; border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent); }
.search-box .search-form__input { font-size: 17px; }
.search-box .search-form__close { border: 0; background: none; color: inherit; font-size: 16px; cursor: pointer; opacity: .6; padding: 4px 6px; }
.search-box .search-form__close:hover { opacity: 1; }
@media (max-width: 767px) {
  .search-overlay { padding: 0; }
  .search-box { width: 100%; border-radius: 0 0 14px 14px; }
}
</style>
