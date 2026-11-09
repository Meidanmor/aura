/**
 * The page's drawers, created by the widgets that need them.
 *
 * The layout (MainLayout.vue) keeps the list and draws one q-drawer per
 * entry; a widget adds its drawer when it's on the page and takes it back
 * when it leaves (useDrawer). So the cart drawer exists only while a Mini
 * Cart is shown, and each Menu widget has its own drawer with its own menu.
 *
 *   key    'cart' | 'wishlist' | 'menu:{block id}'
 *   entry  { kind: 'cart' | 'wishlist' | 'menu', blockId, items?, title, bg, color,
 *            showLanguages?, showNotifications?, swipe: auto | none | left | right,
 *            width ('' or a length), sections (a drawer built from blocks: the
 *            widget's own sections, drawn by DrawerSections.vue; null = the standard one) }
 *
 * Drawers are drawn in the browser only (after hydration), so widgets add
 * them on mount.
 */
import { computed, inject, onBeforeUnmount, onMounted, provide, reactive, watch } from 'vue'

/**
 * A widget's drawer built from blocks: its sections while "Drawer Content" is
 * "Built from blocks" and it has some (else null: the standard drawer).
 */
export function drawerSections(block) {
  const list = block?.data?.drawer_content === 'blocks' && Array.isArray(block?.blocks) ? block.blocks.filter((s) => s && s.enabled !== false) : []
  return list.length ? list : null
}

const FIND = Symbol('qwoo-find-widget')

/** In the layout: how a widget finds another one by id (the header and footer shown on this page). */
export function provideWidgetFinder(getLists) {
  provide(FIND, (id) => {
    if (!id) return null
    const walk = (nodes) => {
      for (const n of Array.isArray(nodes) ? nodes : []) {
        if (!n || typeof n !== 'object') continue
        if (n.id === id) return n
        const found = walk(n.blocks)
        if (found) return found
      }
      return null
    }
    for (const list of getLists()) {
      const found = walk(list)
      if (found) return found
    }
    return null
  })
}

/**
 * The widget whose drawer this widget opens: itself, or with Drawer Content
 * "Same as another widget" the chosen widget of the same type (its content,
 * title, width, colours and swipe). A missing widget, another type, or one
 * that itself points elsewhere: this widget's own standard drawer.
 * Returns a computed { node, id, linked }.
 */
export function useDrawerSource(props) {
  const find = inject(FIND, null)
  return computed(() => {
    const self = props.data || {}
    const d = self.data || {}
    if (d.drawer_content !== 'same') return { node: self, id: props.blockId, linked: false }
    const other = d.drawer_source && d.drawer_source !== props.blockId && find ? find(d.drawer_source) : null
    if (!other || other.type !== self.type || other.enabled === false || other.data?.drawer_content === 'same') {
      return { node: { ...self, data: { ...d, drawer_content: 'standard' } }, id: props.blockId, linked: false }
    }
    return { node: other, id: other.id, linked: true }
  })
}

const KEY = Symbol('qwoo-drawers')
let ownerSeq = 0

/** In the layout: the list, and what's open. */
export function provideDrawers() {
  const state = reactive({
    order: [], // keys, in the order the widgets added them (top of the page first)
    entries: {}, // key -> the first owner's entry
    owners: {}, // key -> [owner, entry][]
    open: '', // the open drawer's key
  })

  const sync = (key) => {
    const owners = state.owners[key] || []
    if (!owners.length) {
      delete state.owners[key]
      delete state.entries[key]
      state.order = state.order.filter((k) => k !== key)
      if (state.open === key) state.open = ''
      return
    }
    state.entries[key] = owners[0][1]
    if (!state.order.includes(key)) state.order.push(key)
  }

  const api = {
    state,
    has: (key) => !!state.entries[key],
    set(key, owner, entry) {
      const owners = (state.owners[key] ||= [])
      const mine = owners.find((o) => o[0] === owner)
      if (mine) mine[1] = entry
      else owners.push([owner, entry])
      sync(key)
    },
    remove(key, owner) {
      if (!state.owners[key]) return
      state.owners[key] = state.owners[key].filter((o) => o[0] !== owner)
      sync(key)
    },
    open(key) {
      if (state.entries[key]) state.open = key
    },
    close(key) {
      if (!key || state.open === key) state.open = ''
    },
    toggle(key) {
      if (state.open === key) state.open = ''
      else api.open(key)
    },
    /** The first menu drawer on the page (for "the menu"). */
    firstMenu: () => state.order.find((k) => k.startsWith('menu:')) || '',
  }
  provide(KEY, api)
  return api
}

/**
 * In a widget: adds its drawer while it's on the page. `key` and `entry` are
 * getters (they follow the widget's settings, e.g. in the live preview); a
 * falsy key means no drawer.
 */
export function useDrawer(key, entry) {
  const api = inject(KEY, null)
  // A plain id: objects kept in reactive state come back as proxies (never equal).
  const owner = `w${++ownerSeq}`
  let current = ''
  let stop = null

  onMounted(() => {
    if (!api) return
    stop = watch(
      () => [key(), entry()],
      ([k, e]) => {
        if (current && current !== k) api.remove(current, owner)
        current = k || ''
        if (current) api.set(current, owner, e)
      },
      { immediate: true, deep: true },
    )
  })
  onBeforeUnmount(() => {
    stop?.()
    if (api && current) api.remove(current, owner)
  })

  return {
    toggle: () => api?.toggle(key()),
    open: () => api?.open(key()),
    isOpen: () => !!api && api.state.open === key(),
  }
}
