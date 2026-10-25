<template>
  <div v-if="others.length" class="together" :style="vars">
    <component :is="'h2'" v-if="d.title" class="together__title" :class="titleText.class" :style="titleText.style">{{ d.title }}</component>
    <p v-if="d.text" class="together__text">{{ d.text }}</p>
    <ul class="together__list">
      <li v-for="item in items" :key="item.id" class="together__item" :class="{ 'is-off': !chosen[item.id] }">
        <label class="together__check">
          <input
              type="checkbox"
              :checked="!!chosen[item.id]"
              :disabled="item.main || !item.buyable"
              :aria-label="item.name"
              @change="chosen[item.id] = $event.target.checked"
          >
        </label>
        <img v-if="item.image" :src="item.image" :alt="''" class="together__img" loading="lazy" width="64" height="64">
        <div class="together__info">
          <component :is="item.main ? 'span' : RouterLink" v-bind="item.main ? {} : { to: item.url }" class="together__name" :class="nameText.class" :style="nameText.style">
            <span v-if="item.main" class="together__this">{{ t('This item:') }}</span> {{ item.name }}
          </component>
          <!-- eslint-disable-next-line vue/no-v-html -- built from the store's numbers, escaped -->
          <span class="together__price" :class="priceText.class" :style="priceText.style" v-html="item.priceHtml" />
          <span v-if="!item.buyable" class="together__note">{{ item.hasOptions ? t('Choose options on its page') : t('Out of stock') }}</span>
        </div>
      </li>
    </ul>
    <div class="together__foot">
      <div class="together__total">
        <span>{{ d.total_label || t('Total') }}</span>
        <!-- eslint-disable-next-line vue/no-v-html -- built from the store's numbers, escaped -->
        <strong v-html="totalHtml" />
      </div>
      <q-btn
          class="together__btn"
          :style="btnStyle"
          unelevated
          no-caps
          :color="btnBg ? undefined : 'secondary'"
          :label="d.button_label || t('Add all to cart')"
          :disable="!pickedCount"
          :loading="adding"
          @click="addAll"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import cart from 'src/stores/cart.js'
import { fetchProductById } from 'src/api/woocommerce.js'
import { formatStoreAmount } from 'src/utils/formatters.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { toCssLength } from 'src/composables/useSectionStyle.js'
import { gradientOf } from 'src/utils/gradient.js'
import { useI18n } from 'src/i18n/index.js'

/**
 * "Bought Together" (product page template): this product and the ones the owner
 * picked for it (Products → a product → Bought together), each with a checkbox,
 * the total of what's ticked and one button that adds them all. Products with
 * options or out of stock can't be ticked (they link to their page).
 * Nothing when the product has none picked.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const { t } = useI18n()
const d = computed(() => props.data.data || {})
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const nameText = computed(() => textStyle(d.value, tsKeys('name')))
const priceText = computed(() => textStyle(d.value, tsKeys('price')))

const ids = computed(() => (p?.product?.extensions?.qwoo?.bought_together || []).map(Number).filter(Boolean))
const loaded = ref([])
watch(ids, async (list) => {
  if (!list.length) { loaded.value = []; return }
  const found = await Promise.all(list.map((id) => fetchProductById(id).catch(() => null)))
  loaded.value = found.filter((x) => x && x.id)
}, { immediate: true })
onMounted(() => p?.loadExtras?.())

const pathOf = (prod) => { try { return prod?.permalink ? new URL(prod.permalink, 'http://x').pathname : '' } catch { return '' } }
const hasOptions = (prod) => ['variable', 'grouped', 'external'].includes(prod?.type) || prod?.has_options === true
const toItem = (prod, main = false) => ({
  id: prod.id, main, name: prod.name, url: pathOf(prod),
  image: prod.images?.[0]?.thumbnail || prod.images?.[0]?.src || '',
  prices: prod.prices, hasOptions: !main && hasOptions(prod),
  buyable: main || (!hasOptions(prod) && prod.is_in_stock !== false && prod.is_purchasable !== false),
  priceHtml: prod.prices ? formatStoreAmount(prod.prices, prod.prices.price) : '',
})
const others = computed(() => loaded.value.map((x) => toItem(x)))
const items = computed(() => {
  const main = p?.product && d.value.include_main !== false ? [toItem(p.product, true)] : []
  return [...main, ...others.value]
})

const chosen = reactive({})
watch(items, (list) => { for (const i of list) if (!(i.id in chosen)) chosen[i.id] = i.buyable }, { immediate: true })
const picked = computed(() => items.value.filter((i) => chosen[i.id] && i.buyable))
const pickedCount = computed(() => picked.value.length)

// The main product's price is its chosen option's when it has options.
const totalHtml = computed(() => {
  const first = items.value.find((i) => i.prices)
  if (!first) return ''
  let sum = 0
  for (const i of picked.value) {
    if (i.main && p?.selectedVariation?.prices) sum += Number(p.selectedVariation.prices.price) || 0
    else sum += Number(i.prices?.price) || 0
  }
  return formatStoreAmount(first.prices, String(sum))
})

const adding = ref(false)
async function addAll() {
  if (adding.value || !pickedCount.value) return
  adding.value = true
  try {
    const list = picked.value
    for (let n = 0; n < list.length; n++) {
      const i = list[n]
      const last = n === list.length - 1
      // The main product goes in the way its own Add to cart button would (with its chosen option).
      if (i.main) {
        if (p.isVariable && !p.selectedVariation) { p.variationError = t('Please select a variation first.'); continue }
        if (p.isVariable) await cart.add(i.id, 1, p.selectedVariation.id, p.selectedVariations, null, p.product, last)
        else await cart.add(i.id, 1, null, {}, null, p.product, last)
      } else {
        await cart.add(i.id, 1, null, {}, null, loaded.value.find((x) => x.id === i.id) || null, last)
      }
    }
  } finally {
    adding.value = false
  }
}

const btnBg = computed(() => resolveGlobalColor(d.value.button_bg))
const btnStyle = computed(() => {
  const s = {}
  const bg = gradientOf(d.value.button_bg, d.value.button_bg2, 90)
  if (bg) s.background = `${bg} !important`
  const txt = resolveGlobalColor(d.value.button_text)
  if (txt) s.color = `${txt} !important`
  const r = toCssLength(d.value.button_radius)
  if (r) s['border-radius'] = r
  return s
})
const vars = computed(() => {
  const v = {}
  const map = { box_bg: '--tg-bg', box_border: '--tg-border', check_color: '--tg-check' }
  for (const [key, css] of Object.entries(map)) {
    const c = resolveGlobalColor(d.value[key])
    if (c) v[css] = c
  }
  const r = toCssLength(d.value.box_radius)
  if (r) v['--tg-radius'] = r
  return v
})
</script>

<style scoped>
.together__title { margin: 0 0 6px; font-size: 1.5em; line-height: 1.25; }
.together__text { margin: 0 0 16px; opacity: .75; }
.together__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.together__item { display: flex; align-items: center; gap: 14px; padding: 12px 14px; background: var(--tg-bg, #fff); border: 1px solid var(--tg-border, rgba(0, 0, 0, .1)); border-radius: var(--tg-radius, 12px); transition: opacity .2s; }
.together__item.is-off { opacity: .55; }
.together__check input { width: 20px; height: 20px; accent-color: var(--tg-check, var(--q-secondary)); cursor: pointer; }
.together__check input:disabled { cursor: default; }
.together__img { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; background: #fff; flex: none; }
.together__info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.together__name { color: inherit; text-decoration: none; font-weight: 600; line-height: 1.3; }
a.together__name:hover { text-decoration: underline; }
.together__this { opacity: .65; font-weight: 400; }
.together__price :deep(del) { opacity: .55; margin-inline-end: 6px; }
.together__note { font-size: .85em; opacity: .7; }
.together__foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 20px; margin-top: 16px; }
.together__total { display: flex; align-items: baseline; gap: 10px; font-size: 1.1em; }
.together__total strong { font-size: 1.3em; }
.together__btn { min-height: 46px; padding: 0 28px; font-weight: 700; }
@media (max-width: 599px) { .together__btn { width: 100%; } }
</style>
