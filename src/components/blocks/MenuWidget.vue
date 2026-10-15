<script setup>
import { computed, inject } from 'vue'
import { matMenu } from '@quasar/extras/material-icons'
import NavMenu from 'components/app/NavMenu.vue'
import { toCssLength, alignToFlex, alignToText } from 'src/composables/useSectionStyle.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { t } from 'src/i18n/index.js'

defineOptions({ name: 'MenuWidget' })

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
  menu: { type: Array, default: null },
  page: { type: String, default: 'home' },
})

const emit = defineEmits(['open-menu', 'toggle-cart', 'toggle-wishlist'])

const siteMenus = inject('siteMenus', null)
const headerMenu = inject('headerMenu', null)
const layoutActions = inject('layoutActions', null)

const d = computed(() => props.data?.data || {})
const isVertical = computed(() => d.value.layout === 'vertical')

// Resolved menu items
const menuItems = computed(() => {
  if (Array.isArray(props.menu) && props.menu.length) {
    return props.menu
  }
  const menuId = d.value.menu_id
  const menusMap = siteMenus?.value || {}
  if (menuId && Array.isArray(menusMap[menuId])) {
    return menusMap[menuId]
  }
  if (Array.isArray(headerMenu?.value) && headerMenu.value.length) {
    return headerMenu.value
  }
  const firstMenu = Object.values(menusMap).find((list) => Array.isArray(list) && list.length)
  if (firstMenu) {
    return firstMenu
  }
  return []
})

const mobileMenuEnabled = computed(() => !isVertical.value && !!d.value.enable_mobile_menu)

// null = no mobile menu breakpoint (always desktop or vertical)
const breakpoint = computed(() => {
  if (!mobileMenuEnabled.value) return null
  const raw = d.value.mobile_menu_breakpoint
  if (raw === 'none') return null
  const n = Number(raw === 'custom' || raw === undefined || raw === '' ? (d.value.mobile_menu_custom_breakpoint ?? 990) : raw)
  return Number.isFinite(n) && n > 0 ? n : null
})

// Class that scopes the generated CSS to this block instance.
const scope = computed(() => `hm-${(props.blockId || 'x').replace(/[^\w-]/g, '')}`)

function onToggleMobileMenu() {
  emit('open-menu')
  layoutActions?.openMobileMenu?.()
}

const colorValue = (c) => (c ? resolveGlobalColor(c) || c : '')

const css = computed(() => {
  const s = `.${scope.value}`
  const rules = []

  if (d.value.gap) {
    const g = toCssLength(d.value.gap)
    if (g) rules.push(`${s} .nav-top { gap: ${g}; }`, `${s} .menu-vertical { gap: ${g}; }`)
  }

  if (d.value.alignment) {
    const justify = alignToFlex(d.value.alignment)
    const text = alignToText(d.value.alignment)
    if (justify) rules.push(`${s} .nav-top { justify-content: ${justify}; }`)
    if (text) rules.push(`${s} .menu-vertical { text-align: ${text}; }`, `${s} .menu-v-item { text-align: ${text}; }`)
  }

  if (d.value.link_color) {
    const c = colorValue(d.value.link_color)
    if (c) rules.push(`${s} .nav-link, ${s} .menu-v-link { color: ${c} !important; }`)
  }

  if (d.value.link_hover_color) {
    const c = colorValue(d.value.link_hover_color)
    if (c) rules.push(`${s} .nav-link:hover, ${s} .menu-v-link:hover { color: ${c} !important; }`)
  }

  if (d.value.dropdown_bg_color) {
    const c = colorValue(d.value.dropdown_bg_color)
    if (c) rules.push(`${s} .nav-sub { background: ${c} !important; }`)
  }

  if (breakpoint.value !== null && mobileMenuEnabled.value) {
    rules.push(`
  ${s} .hm-desktop { display: none; }
  @media (min-width: ${toCssLength(breakpoint.value)}) {
    ${s} .hm-desktop { display: flex; }
    ${s} .hm-toggle { display: none; }
  }`)
  }

  return rules.join('\n')
})
</script>

<template>
  <div :class="scope" class="menu-widget-wrap">
    <component :is="'style'" v-if="css">{{ css }}</component>
    <!-- Vertical Layout (Lists, Footers, Sidebars) -->
    <ul v-if="isVertical && Array.isArray(menuItems) && menuItems.length" class="menu-vertical" role="list">
      <li v-for="(item, i) in menuItems" :key="item.id || i" class="menu-v-item">
        <a
          v-if="item.external"
          :href="item.url"
          :target="item.new_tab ? '_blank' : null"
          :rel="item.new_tab ? 'noopener' : null"
          class="menu-v-link no-decoration"
        >{{ item.label }}</a>
        <router-link
          v-else
          :to="item.url"
          class="menu-v-link no-decoration"
          :target="item.new_tab ? '_blank' : null"
        >
          {{ item.label }}
        </router-link>

        <ul v-if="item.children && item.children.length" class="menu-v-sub" role="list">
          <li v-for="(sub, j) in item.children" :key="sub.id || j" class="menu-v-item">
            <a
              v-if="sub.external"
              :href="sub.url"
              :target="sub.new_tab ? '_blank' : null"
              :rel="sub.new_tab ? 'noopener' : null"
              class="menu-v-link no-decoration"
            >{{ sub.label }}</a>
            <router-link
              v-else
              :to="sub.url"
              class="menu-v-link no-decoration"
              :target="sub.new_tab ? '_blank' : null"
            >
              {{ sub.label }}
            </router-link>
          </li>
        </ul>
      </li>
    </ul>

    <!-- Horizontal Navbar Layout (Dropdowns, Top Bars, Header) -->
    <template v-else-if="Array.isArray(menuItems)">
      <q-toolbar class="hm-desktop flex justify-between q-pa-sm">
        <div class="flex nav-items-el">
          <!-- Desktop Navigation -->
          <q-toolbar-title class="nav-bar">
            <NavMenu v-if="menuItems.length" :items="menuItems" />
          </q-toolbar-title>
        </div>
      </q-toolbar>
      <div v-if="mobileMenuEnabled" class="hm-toggle">
        <q-btn flat dense :icon="matMenu" :aria-label="t('Open menu')" data-action="menu" @click="onToggleMobileMenu" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.menu-widget-wrap {
  width: 100%;
}
.menu-vertical {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.menu-v-item {
  position: relative;
}
.menu-v-link {
  display: inline-block;
  color: inherit;
  transition: color 0.15s ease;
}
.menu-v-sub {
  list-style: none;
  margin: 8px 0 0 16px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>