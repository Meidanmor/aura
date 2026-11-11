<template>
  <!-- Phones: a sheet from the bottom (like Sort and Filters). Computers: a window in the middle. -->
  <q-dialog
      :model-value="!!product"
      :position="phone ? 'bottom' : 'standard'"
      @update:model-value="(open) => { if (!open) close() }"
  >
    <div v-if="product" class="quick-options" :class="{ 'quick-options--sheet': phone }" data-sheet role="dialog" :aria-label="t('Choose options')">
      <div v-if="phone" class="quick-options__grip" aria-hidden="true" v-on="drag"><span /></div>
      <div class="quick-options__head" v-on="phone ? drag : {}">
        <b>{{ t('Choose options') }}</b>
        <q-btn flat round dense :icon="matClose" :aria-label="t('Close')" @click="close" />
      </div>

      <div class="quick-options__body">
        <div class="quick-options__photos">
          <div v-if="phone" class="quick-options__strip">
            <img v-for="(img, i) in photos" :key="img.src" :src="img.src" :alt="img.alt || product.name" :loading="i ? 'lazy' : 'eager'" draggable="false">
          </div>
          <template v-else>
            <img class="quick-options__main" :src="photos[photoIndex]?.src" :alt="photos[photoIndex]?.alt || product.name">
            <div v-if="photos.length > 1" class="quick-options__thumbs">
              <button
                  v-for="(img, i) in photos"
                  :key="img.src"
                  type="button"
                  :class="{ 'is-on': i === photoIndex }"
                  :aria-label="t('Photo {n}', { n: i + 1 })"
                  :aria-pressed="i === photoIndex ? 'true' : 'false'"
                  @click="photoIndex = i"
              ><img :src="img.thumbnail || img.src" alt="" loading="lazy"></button>
            </div>
          </template>
        </div>

        <div class="quick-options__side">
          <div>
            <div class="quick-options__name">{{ product.name }}</div>
            <!-- eslint-disable-next-line vue/no-v-html -- the store's price, sanitized -->
            <div class="quick-options__price" v-html="o.selectedVariation.value && !o.variationLoading.value ? variationPrice : price" />
          </div>

          <div v-for="attribute in o.availableAttributes.value" :key="attribute.name">
            <div class="quick-options__label">{{ attribute.name }}<template v-if="o.selectedVariations.value[attribute.name]">: {{ o.selectedVariations.value[attribute.name] }}</template></div>
            <div class="quick-options__choices" role="radiogroup" :aria-label="attribute.name">
              <button
                  v-for="opt in o.getOptionsWithDisabled(attribute)"
                  :key="opt.value"
                  type="button"
                  role="radio"
                  class="quick-options__choice"
                  :class="{ 'is-on': o.selectedVariations.value[attribute.name] === opt.value }"
                  :aria-checked="o.selectedVariations.value[attribute.name] === opt.value ? 'true' : 'false'"
                  :disabled="opt.disable"
                  @click="choose(attribute.name, opt.value)"
              >{{ opt.label }}</button>
            </div>
          </div>
          <div v-if="tried && o.shouldDisableCartButtons.value" class="text-negative text-caption" role="alert">{{ t('Please select all variation options.') }}</div>
          <div v-else-if="outOfStock" class="text-negative text-caption" role="alert">{{ t('Out of stock') }}</div>

          <button type="button" class="quick-options__more" @click="fullDetails">{{ t('Full details') }}</button>
        </div>
      </div>

      <div class="quick-options__foot">
        <div class="quick-options__qty">
          <button type="button" :aria-label="t('Decrease quantity')" :disabled="quantity <= 1" @click="quantity--">−</button>
          <span aria-live="polite">{{ quantity }}</span>
          <button type="button" :aria-label="t('Increase quantity')" :disabled="quantity >= maxQty" @click="quantity++">+</button>
        </div>
        <q-btn
            class="quick-options__add"
            color="secondary"
            unelevated
            no-caps
            :loading="adding || o.variationLoading.value"
            :disable="outOfStock"
            :label="t('Add to cart')"
            @click="add"
        />
      </div>
    </div>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { matClose } from '@quasar/extras/material-icons'
import cart from 'src/stores/cart.js'
import { closeQuickOptions, quickOptions } from 'src/composables/useQuickOptions.js'
import { useProductOptions } from 'src/composables/useProductOptions.js'
import { useSanitizedPrice } from 'src/composables/useSanitizedHtml'
import { useSheetDrag } from 'src/composables/useSheetDrag.js'
import { loopItemUrl } from 'src/components/loops/loop-item.js'
import { t } from 'src/i18n/index.js'

/**
 * "Choose options" from a product card (the card's Add to Cart Button → Products With
 * Options: Choose in a popup): the product's photos, its options, a quantity and Add to
 * cart, without leaving the list. Once in the layout; opened by openQuickOptions(product).
 * The choosing itself is the product page's (useProductOptions).
 */
const $q = useQuasar()
const router = useRouter()
const product = computed(() => quickOptions.product)
const o = useProductOptions(product)
const phone = computed(() => $q.screen.lt.md)
const close = () => closeQuickOptions()
const drag = useSheetDrag(close)

const quantity = ref(1)
const photoIndex = ref(0)
const tried = ref(false)
const adding = ref(false)

// A product opened: nothing chosen yet. Its variations' prices come once from the store.
watch(product, (p) => {
  o.resetVariations()
  quantity.value = 1
  photoIndex.value = 0
  tried.value = false
  if (p) o.loadVariationPrices()
})
// Moving to another page closes it.
watch(() => router.currentRoute.value.fullPath, close)

const price = useSanitizedPrice(() => product.value?.price_html)
const variationPrice = useSanitizedPrice(() => o.selectedVariation.value?.price_html)
// The chosen variation's own photo first, then the product's.
const photos = computed(() => {
  const own = product.value?.images || []
  const chosen = o.selectedVariation.value?.images?.[0]
  const list = chosen?.src && !own.some((img) => img.src === chosen.src) ? [chosen, ...own] : own
  return list.length ? list : [{ src: '/naturaBloom-circle.svg', alt: '' }]
})
watch(() => o.selectedVariation.value?.id, () => {
  const chosen = o.selectedVariation.value?.images?.[0]
  const i = chosen?.src ? photos.value.findIndex((img) => img.src === chosen.src) : -1
  if (i >= 0) photoIndex.value = i
})
const outOfStock = computed(() => !!o.selectedVariation.value && o.selectedVariation.value.is_in_stock === false)
const maxQty = computed(() => Number(o.selectedVariation.value?.add_to_cart?.maximum) || 99)
watch(maxQty, (max) => { if (quantity.value > max) quantity.value = max })

function choose(name, value) {
  const picks = o.selectedVariations.value
  // A second tap takes the choice off.
  if (picks[name] === value) delete picks[name]
  else picks[name] = value
  o.onVariationChange()
}

async function add() {
  if (o.shouldDisableCartButtons.value) {
    tried.value = true
    return
  }
  const chosen = o.chosenForCart()
  if (!chosen || adding.value) return
  adding.value = true
  try {
    const p = product.value
    close()
    await cart.add(p.id, quantity.value, chosen.id, chosen.variation, $q, '', true)
  } finally {
    adding.value = false
  }
}

function fullDetails() {
  const to = loopItemUrl('product', product.value)
  close()
  if (to) router.push(to)
}
</script>

<style scoped>
.quick-options {
  display: flex; flex-direction: column;
  width: 760px; max-width: 94vw; max-height: 86vh;
  background: var(--q-primary, #fff); color: var(--q-text, inherit);
  border-radius: 18px; overflow: hidden;
}
.quick-options--sheet { width: 100vw; max-width: 100vw; max-height: 88vh; border-radius: 20px 20px 0 0; }
.quick-options__grip { display: flex; justify-content: center; padding: 8px 0 2px; touch-action: none; cursor: grab; }
.quick-options__grip span { width: 40px; height: 4px; border-radius: 4px; background: currentColor; opacity: .25; }
.quick-options__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px 8px 16px; }
.quick-options--sheet .quick-options__head { touch-action: none; padding-top: 2px; }
.quick-options__body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 20px; padding: 0 16px 16px; overflow-y: auto; }
.quick-options--sheet .quick-options__body { grid-template-columns: minmax(0, 1fr); gap: 14px; }
.quick-options__main { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 12px; }
.quick-options__thumbs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.quick-options__thumbs button { width: 52px; height: 52px; padding: 0; border: 2px solid transparent; border-radius: 10px; background: none; overflow: hidden; cursor: pointer; }
.quick-options__thumbs button.is-on { border-color: currentColor; }
.quick-options__thumbs img { display: block; width: 100%; height: 100%; object-fit: cover; }
.quick-options__strip { display: flex; gap: 8px; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
/* Square photos, never taller than about a third of the screen, so the options stay in view. */
.quick-options__strip img { flex: none; width: min(62vw, 34vh); height: min(62vw, 34vh); object-fit: cover; border-radius: 12px; scroll-snap-align: start; }
.quick-options__side { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.quick-options__name { font-size: 18px; font-weight: 600; line-height: 1.3; }
.quick-options__price { margin-top: 2px; opacity: .85; }
.quick-options__label { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.quick-options__choices { display: flex; flex-wrap: wrap; gap: 8px; }
.quick-options__choice { border: 1.5px solid rgba(0, 0, 0, .18); background: transparent; color: inherit; border-radius: 999px; padding: 6px 14px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
.quick-options__choice:hover { border-color: currentColor; }
.quick-options__choice.is-on { background: var(--q-secondary); border-color: var(--q-secondary); color: var(--q-primary, #fff); }
.quick-options__choice:disabled { opacity: .4; text-decoration: line-through; cursor: default; border-color: rgba(0, 0, 0, .18); }
.quick-options__more { align-self: flex-start; padding: 4px 0; border: 0; background: none; color: inherit; font: inherit; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.quick-options__foot { display: flex; align-items: center; gap: 12px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid rgba(0, 0, 0, .1); }
.quick-options__qty { display: inline-flex; align-items: center; border: 1.5px solid rgba(0, 0, 0, .18); border-radius: 999px; }
.quick-options__qty button { width: 38px; height: 40px; border: 0; background: none; color: inherit; font-size: 18px; cursor: pointer; }
.quick-options__qty button:disabled { opacity: .35; cursor: default; }
.quick-options__qty span { min-width: 24px; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
.quick-options__add { flex: 1; min-height: 44px; border-radius: 999px; }
</style>
