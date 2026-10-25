<template>
  <q-header :class="headerClasses" :style="outerStyle">
    <div ref="inner" class="header-inner" :style="headerStyle">
      <SectionRenderer :sections="ownSections" page="header"/>
    </div>
    <!--<div class="container">
      <q-toolbar class="flex justify-between q-pa-sm">
        <div class="flex nav-items-el">-->
          <!-- Desktop Navigation -->
         <!-- <q-toolbar-title class="nav-bar gt-sm"> -->
            <!-- The owner's menu (Design → Menus); stores published before menus existed keep the old links. -->
           <!-- <NavMenu v-if="Array.isArray(menu)" :items="menu" />
            <template v-else>
              <router-link to="/" class="text-h6 no-decoration">{{ t('Home') }}</router-link>
              <router-link to="/products/" class="text-h6 no-decoration">{{ t('Products') }}</router-link>
              <router-link to="/cart/" class="text-h6 no-decoration">{{ t('Cart') }}</router-link>
              <router-link to="/checkout/" class="text-h6 no-decoration">{{ t('Checkout') }}</router-link>
              <router-link to="/my-account/" class="text-h6 no-decoration">{{ t('My account') }}</router-link>
            </template>
          </q-toolbar-title>
--->
          <!-- Mobile Menu Toggle -->
          <!--<q-btn flat dense :icon="matMenu" :aria-label="t('Open menu')" data-action="menu" class="lt-md" @click="emit('open-menu')" />

        </div>
        <router-link to="/" :aria-label="t('Navigate to home page')" class="flex items-center order-first">
          <img v-if="appLogo" :alt="storeName ? t('{name} logo', { name: storeName }) : t('Logo')" :src="appLogo" :width="logoWidth || undefined" :height="logoHeight || undefined" class="header-logo" loading="eager" decoding="sync" fetchpriority="high" />
          ---><!-- No logo yet: the store's name instead of a broken image. -->
         <!-- <span v-else class="header-store-name">{{ storeName || t('Home') }}</span>
        </router-link>
        <div class="flex items-center no-wrap">
          <LanguageSwitcher class="gt-sm" />
          <q-btn flat dense :icon="matFavoriteBorder" :aria-label="t('Add to wishlist')" data-action="wishlist" @click="emit('toggle-wishlist')" class="q-ml-sm q-mr-sm">
            <q-no-ssr>
              <q-badge v-if="wishlist.state.items && Object.keys(wishlist.state.items).length > 0" floating color="red">{{ Object.keys(wishlist.state.items).length }}</q-badge>
            </q-no-ssr>
          </q-btn>

          <q-btn flat dense :icon="matShoppingCart" :aria-label="t('View cart')" data-action="cart" @click="emit('toggle-cart')">
            <q-no-ssr>
              <q-badge v-if="cart.state.items_count > 0" floating color="red">{{ cart.state.items_count }}</q-badge>
            </q-no-ssr>
          </q-btn>
        </div>
      </q-toolbar>
    </div>----->
  </q-header>
</template>

<script setup>
/*import { matShoppingCart,
  matFavoriteBorder,
  matMenu } from '@quasar/extras/material-icons'
import wishlist from 'src/stores/wishlist'
import NavMenu from './NavMenu.vue'
import LanguageSwitcher from './LanguageSwitcher.vue'
import cart from 'src/stores/cart'*/
//import { storeName as liveStoreName } from 'src/utils/site-info.js'
import SectionRenderer from "components/sections/SectionRenderer.vue";
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { stripLang } from 'src/i18n/lang.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'

//const storeName = liveStoreName()

const props = defineProps({
  headerConfig: {
    type: Object,
    required: true
  },
  isSuperAdmin: {
    type: Boolean,
    required: true
  },
  appLogo: {
    type: String,
    default: ''
  },
  // The logo file's own size (branding.json), so the browser saves its space before it loads.
  logoWidth: {
    type: Number,
    default: 0
  },
  logoHeight: {
    type: Number,
    default: 0
  },
  stickyHeader: {
    type: Boolean,
    default: false,
    required: true
  },
  // The header menu: [ { label, url, new_tab, external, children } ]; null before the store published one.
  menu: {
    type: Array,
    default: null
  }
})

/**
 * "Keep the header visible while scrolling": sticky (in the page, stays at
 * the top) or fixed (floats over the first section, e.g. a hero). A fixed
 * header only floats on pages built from sections (homepage, own pages);
 * elsewhere, and once the visitor scrolls, it's "solid": the owner's
 * after-scrolling colours, else the site's background. A sticky header
 * takes the after-scrolling colours once the visitor scrolls.
 */
const route = useRoute()
const settings = computed(() => props.headerConfig?.settings || {})
// "Above header" sections are drawn before the header element (MainLayout.vue).
const ownSections = computed(() => (props.headerConfig?.sections || []).filter((s) => s?.location !== 'above'))
const fixed = computed(() => props.stickyHeader && settings.value.sticky_mode === 'fixed')
const sectionPage = computed(() => {
  const name = String(route.name || '')
  return stripLang(route.path).replace(/\/+$/, '') === '' || name === 'custom-page' || name.startsWith('custom-page@')
})
const overHero = computed(() => fixed.value && sectionPage.value)
const scrolled = ref(false)
// Fixed: solid unless it floats over the hero; sticky: solid once scrolled.
const solid = computed(() => props.stickyHeader && (fixed.value ? !overHero.value || scrolled.value : scrolled.value))

const solidText = computed(() => (solid.value ? resolveGlobalColor(settings.value.solid_text) : ''))
const headerClasses = computed(() => ({
  sticky: props.stickyHeader,
  'header-fixed': fixed.value,
  'header-over': overHero.value,
  'header-solid': solid.value,
  'header-solid-text': !!solidText.value,
}))
// The colours sit on the inner box: a header floating over the hero takes no height itself.
// The header's own background (settings.bg) fills it all; a fixed header over the hero
// stays clear unless the owner gave it one, and takes its after-scrolling colour once solid.
const PADDING_RE = /^\d+(\.\d+)?(px|rem|em|vh|vw|%)$/
const headerStyle = computed(() => {
  const style = {}
  const pad = settings.value.padding && typeof settings.value.padding === 'object' ? settings.value.padding : {}
  const sides = ['top', 'right', 'bottom', 'left'].map((side) => {
    const v = String(pad[side] ?? '').trim()
    return PADDING_RE.test(v) ? v : (/^\d+(\.\d+)?$/.test(v) ? v + 'px' : '0')
  })
  if (sides.some((v) => v !== '0')) style.padding = sides.join(' ')
  const own = resolveGlobalColor(settings.value.bg)
  if (solid.value) style.backgroundColor = resolveGlobalColor(settings.value.solid_bg) || own || 'var(--q-bg)'
  else if (!fixed.value) style.backgroundColor = own || 'var(--q-bg)'
  else style.backgroundColor = own || 'transparent'
  if (solidText.value) style['--header-solid-text'] = solidText.value
  return style
})

/**
 * "Distance from the top" (sticky_top): where the header stays while
 * scrolling. Its height is measured (and again when it changes) for sticky
 * sections and blocks set to stay "below the header".
 */
const inner = ref(null)
const stickyTop = computed(() => {
  const v = String(settings.value.sticky_top || '').trim()
  return /^-?\d+(\.\d+)?(px|rem|em|vh)$/.test(v) ? v : (/^-?\d+(\.\d+)?$/.test(v) ? v + 'px' : '0px')
})
const outerStyle = computed(() => {
  const style = { backgroundColor: 'transparent' }
  if (props.stickyHeader && stickyTop.value !== '0px') style.top = stickyTop.value
  return style
})
function measureStuck() {
  // What stays on screen once scrolled (app.css .sb-sticky-*: --qwoo-header-stuck).
  let stuck = 0
  if (props.stickyHeader && inner.value) {
    const top = parseFloat(stickyTop.value) || 0
    stuck = Math.max(0, Math.round(inner.value.getBoundingClientRect().height + (stickyTop.value.endsWith('px') ? top : 0)))
  }
  document.documentElement.style.setProperty('--qwoo-header-stuck', `${stuck}px`)
}
let resizeObserver = null
watch(() => [props.stickyHeader, stickyTop.value], () => nextTick(measureStuck))

const onScroll = () => { scrolled.value = window.scrollY > 10 }
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  measureStuck()
  if (typeof ResizeObserver !== 'undefined' && inner.value) {
    resizeObserver = new ResizeObserver(measureStuck)
    resizeObserver.observe(inner.value)
  }
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  resizeObserver?.disconnect()
})

/*const emit = defineEmits([
  'open-menu',
  'toggle-cart',
  'toggle-wishlist'
])*/

</script>