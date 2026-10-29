<template>
  <div v-if="(d.text || (run && btnIcon) || (d.url && btnIcon)) && (d.url || run)" class="btn-block" :class="fullWidthClasses" :style="wrapVars">
    <q-btn
        v-bind="run ? {} : linkAttrs"
        :icon="btnIcon && !iconAtEnd ? btnIcon : undefined"
        :icon-right="btnIcon && iconAtEnd ? btnIcon : undefined"
        :aria-label="ariaLabel || (!d.text && d.label) || undefined"
        :loading="adding"
        @click="run && run()"
        class="btn-block__btn"
        :class="[`btn-block__btn--${variant}`, `btn-block__btn--${size}`, labelText.class, paddingVars.cls, { 'has-icon-gap': hasIconGap }]"
        :style="btnVars"
        :label="d.text || undefined"
        :outline="variant === 'outline'"
        :flat="variant === 'flat' || variant === 'link'"
        :unelevated="variant === 'primary' || variant === 'secondary'"
        :color="qColor"
        :size="qSize"
        no-caps
    />
  </div>
</template>

<script setup>
import { zeroPriceButton } from 'src/utils/zero-price.js'
import { computed, inject, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import cart from 'src/stores/cart.js'
import { fetchProductById } from 'src/api/woocommerce.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { brandFontVar } from 'src/utils/brand-fonts.js'
import { generalIcons } from 'src/utils/builder-icons.js'
import { gradientOf } from 'src/utils/gradient.js'
import { textStyle } from 'src/utils/text-style.js'
import { asResponsive, setResponsiveVar, toCssLength, alignToFlex, DEVICES } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
  // A button that runs this instead of following a link (the Filters Button block).
  action: { type: Function, default: null },
  icon: { type: String, default: '' },
  iconRight: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '' },
})

const route = useRoute()
const router = useRouter()
const d = computed(() => props.data.data || {})

// The icon: the Filters Button's own, else Content → Show an icon (a built-in
// icon, or your own SVG drawn as an image).
const btnIcon = computed(() => {
  if (props.icon) return props.icon
  if (!d.value.show_icon) return ''
  if (d.value.icon === 'custom') return d.value.custom_icon?.url ? `img:${d.value.custom_icon.url}` : ''
  return generalIcons[d.value.icon] || ''
})
const iconAtEnd = computed(() => (props.icon ? props.iconRight : d.value.icon_position === 'end'))

// "When Clicked: Add a product to the cart" / "… and go to checkout": simple products
// go in the cart, products with options (sizes, colours) open their page to choose.
const buyNow = computed(() => d.value.click_action === 'buy_now')
// 'Use this page's product' (product page template): the product being viewed, with the shopper's options.
const productPage = inject('productPage', null)
const useCurrent = computed(() => !!(d.value.product_current && productPage?.product?.id))
const cartProductId = computed(() => {
  if (!['add_to_cart', 'buy_now'].includes(d.value.click_action)) return 0
  if (useCurrent.value) return productPage.product.id
  return Number(d.value.product_ids?.[0]) || 0
})
const adding = ref(false)
async function addProduct() {
  if (adding.value) return
  adding.value = true
  try {
    if (useCurrent.value) return await addCurrent()
    const product = await fetchProductById(cartProductId.value).catch(() => null)
    const hasOptions = ['variable', 'grouped', 'external'].includes(product?.type) || product?.has_options === true
    // No price or 0, not for sale (the store's setting): the owner's link, else the product's page.
    const zero = zeroPriceButton(product)
    if (zero && !zero.hide) {
      if (zero.to) await router.push(zero.to)
      else if (zero.href) window.open(zero.href, zero.external ? '_blank' : '_self', 'noopener')
      return
    }
    if (product && (hasOptions || zero)) {
      const path = product.permalink ? new URL(product.permalink, 'http://x').pathname : ''
      if (path) await router.push(path)
      return
    }
    await cart.add(cartProductId.value, 1, null, {}, null, product || null, !buyNow.value)
    if (buyNow.value) await router.push('/checkout')
  } finally {
    adding.value = false
  }
}
async function addCurrent() {
  const product = productPage.product
  const zero = zeroPriceButton(product, { onProductPage: true })
  if (zero) {
    if (zero.to) await router.push(zero.to)
    else if (zero.href) window.open(zero.href, zero.external ? '_blank' : '_self', 'noopener')
    return
  }
  if (!(await productPage.addCurrentToCart({ checkout: buyNow.value }))) return
  if (buyNow.value) await router.push('/checkout')
}
const run = computed(() => props.action || (cartProductId.value ? addProduct : null))

const VARIANTS = new Set(['primary', 'secondary', 'outline', 'flat', 'link'])
const variant = computed(() => (VARIANTS.has(d.value.style) ? d.value.style : 'primary'))
const size = computed(() => (['sm', 'md', 'lg'].includes(d.value.size) ? d.value.size : 'md'))
const qSize = computed(() => ({ sm: 'sm', md: 'md', lg: 'lg' }[size.value]))

// Custom colors win over the variant's theme color.
const qColor = computed(() => {
  if (d.value.bg_color && (variant.value === 'primary' || variant.value === 'secondary')) return undefined
  return variant.value === 'secondary' ? 'secondary' : 'primary'
})

const linkAttrs = computed(() => {
  const url = d.value.url || ''
  const newTab = !!d.value.new_tab

  if (url.startsWith('#')) {
    // In-page anchor (e.g. a section's Anchor ID).
    return { to: { path: route.path, hash: url } }
  }
  if (url.startsWith('/') && !url.startsWith('//')) {
    return newTab ? { to: url, target: '_blank', rel: 'noopener' } : { to: url }
  }
  return newTab
      ? { href: url, target: '_blank', rel: 'noopener noreferrer', type: 'a' }
      : { href: url, type: 'a' }
})

const wrapVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--btn-justify', d.value.alignment, alignToFlex)
  return vars
})

const fullWidthClasses = computed(() => {
  const a = asResponsive(d.value.alignment)
  return { 'btn-full-d': a.desktop === 'stretch', 'btn-full-t': a.tablet === 'stretch', 'btn-full-m': a.mobile === 'stretch' }
})

// Button Text: its size, weight, letter spacing and case (font and color are set with the button's own).
const labelText = computed(() => textStyle(d.value, { size: 'text_size', weight: 'font_weight', lh: 'label_line_height', spacing: 'label_spacing', textCase: 'label_case' }))

const btnVars = computed(() => {
  const vars = {}
  const bg = resolveGlobalColor(d.value.bg_color)
  const txt = resolveGlobalColor(d.value.text_color)
  if (variant.value === 'primary' || variant.value === 'secondary') {
    // Set explicitly: the theme's global `body .q-btn { background: … }`
    // rule would otherwise override Quasar's bg-primary/bg-secondary.
    // A second colour makes it a gradient.
    vars.background = gradientOf(d.value.bg_color, d.value.bg_color2, d.value.gradient_angle ?? 90) || `var(--q-${variant.value})`
  } else if (bg && variant.value === 'outline') {
    vars['border-color'] = bg
  }
  // !important: Quasar's text-* color classes are !important themselves.
  if (txt) vars.color = `${txt} !important`
  const radius = toCssLength(d.value.border_radius)
  if (radius) vars['border-radius'] = radius
  const font = brandFontVar(d.value.font, 'buttons')
  if (font) vars['font-family'] = font
  Object.assign(vars, labelText.value.style)
  Object.assign(vars, paddingVars.value.vars)
  const iconSize = toCssLength(d.value.icon_size)
  if (iconSize) vars['--btn-icon-size'] = iconSize
  const iconColor = resolveGlobalColor(d.value.icon_color)
  if (iconColor) vars['--btn-icon-color'] = iconColor
  setResponsiveVar(vars, '--btn-icon-gap', d.value.icon_gap, toCssLength)
  return vars
})

// Style → Icon → Space Between Icon and Text (per screen size; unset keeps Quasar's 12px).
const hasIconGap = computed(() => DEVICES.some((device) => { const v = asResponsive(d.value.icon_gap)[device]; return v !== '' && v != null }))

// Style → Button Padding: { desktop: { top, right, bottom, left }, … }, each side on its own.
const SIDES = ['top', 'right', 'bottom', 'left']
const SHORT = { desktop: 'd', tablet: 't', mobile: 'm' }
const SUFFIX = { desktop: '', tablet: '-t', mobile: '-m' }
const paddingVars = computed(() => {
  const vars = {}
  const cls = {}
  const r = asResponsive(d.value.btn_padding)
  const last = {}
  for (const device of DEVICES) {
    const box = r[device] && typeof r[device] === 'object' ? r[device] : {}
    for (const side of SIDES) {
      // A side left empty on a smaller screen keeps the bigger screen's.
      let v = toCssLength(box[side])
      if (v === null || v === undefined || v === '') v = last[side]
      if (v === null || v === undefined || v === '') continue
      last[side] = v
      vars[`--bp-${side}${SUFFIX[device]}`] = v
      cls[`bp-${side[0]}-${SHORT[device]}`] = true
    }
  }
  return { vars, cls }
})
</script>

<style scoped>
.btn-block { display: flex; justify-content: var(--btn-justify, flex-start); }
@media (max-width: 1023px) { .btn-block { justify-content: var(--btn-justify-t, var(--btn-justify, flex-start)); } }
@media (max-width: 767px) { .btn-block { justify-content: var(--btn-justify-m, var(--btn-justify-t, var(--btn-justify, flex-start))); } }

/* "Full width" alignment, per device. */
@media (min-width: 1024px) { .btn-full-d .btn-block__btn { width: 100%; } }
@media (min-width: 768px) and (max-width: 1023px) { .btn-full-t .btn-block__btn { width: 100%; } }
@media (max-width: 767px) { .btn-full-m .btn-block__btn { width: 100%; } }

.btn-block__btn--lg { padding: 10px 30px; }
/* Button Padding, per side and screen size (beats the size's padding and Quasar's min-height). */
@media (min-width: 1024px) {
  .bp-t-d { padding-top: var(--bp-top) !important; min-height: 0; }
  .bp-r-d { padding-right: var(--bp-right) !important; }
  .bp-b-d { padding-bottom: var(--bp-bottom) !important; min-height: 0; }
  .bp-l-d { padding-left: var(--bp-left) !important; }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .bp-t-t { padding-top: var(--bp-top-t, var(--bp-top)) !important; min-height: 0; }
  .bp-r-t { padding-right: var(--bp-right-t, var(--bp-right)) !important; }
  .bp-b-t { padding-bottom: var(--bp-bottom-t, var(--bp-bottom)) !important; min-height: 0; }
  .bp-l-t { padding-left: var(--bp-left-t, var(--bp-left)) !important; }
}
@media (max-width: 767px) {
  .bp-t-m { padding-top: var(--bp-top-m, var(--bp-top-t, var(--bp-top))) !important; min-height: 0; }
  .bp-r-m { padding-right: var(--bp-right-m, var(--bp-right-t, var(--bp-right))) !important; }
  .bp-b-m { padding-bottom: var(--bp-bottom-m, var(--bp-bottom-t, var(--bp-bottom))) !important; min-height: 0; }
  .bp-l-m { padding-left: var(--bp-left-m, var(--bp-left-t, var(--bp-left))) !important; }
}
.btn-block__btn--link { text-decoration: underline; text-underline-offset: 6px; padding-left: 0; padding-right: 0; }
.btn-block__btn--link :deep(.q-focus-helper) { display: none; }
/* Logical margins: they replace Quasar's .on-left / .on-right margin on either text direction. */
.has-icon-gap { --btn-gap-now: var(--btn-icon-gap, 12px); }
@media (max-width: 1023px) { .has-icon-gap { --btn-gap-now: var(--btn-icon-gap-t, var(--btn-icon-gap, 12px)); } }
@media (max-width: 767px) { .has-icon-gap { --btn-gap-now: var(--btn-icon-gap-m, var(--btn-icon-gap-t, var(--btn-icon-gap, 12px))); } }
.has-icon-gap :deep(.q-icon.on-left) { margin-inline: 0 var(--btn-gap-now); }
.has-icon-gap :deep(.q-icon.on-right) { margin-inline: var(--btn-gap-now) 0; }
.btn-block__btn :deep(.q-icon) { font-size: var(--btn-icon-size, 1.4em); color: var(--btn-icon-color, inherit); }
</style>
