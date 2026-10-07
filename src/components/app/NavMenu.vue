<template>
  <!-- The header menu (Design → Menus): items inside items open as dropdowns
       (deeper ones fly out to the side), on hover and on keyboard focus. -->
  <ul class="nav-menu" :class="depth ? 'nav-sub' : 'nav-top'" role="list">
    <li v-for="(item, i) in items" :key="i" class="nav-item" :class="{ 'has-sub': item.children?.length }">
      <a
        v-if="item.external"
        :href="item.url"
        :target="item.new_tab ? '_blank' : null"
        :rel="item.new_tab ? 'noopener' : null"
        class="nav-link no-decoration"
        :class="{ 'text-h6': !depth }"
      >{{ item.label }}</a>
      <router-link v-else :to="item.url" class="nav-link no-decoration" :class="{ 'text-h6': !depth }" :target="item.new_tab ? '_blank' : null">
        {{ item.label }}
      </router-link>
      <NavMenu v-if="item.children?.length" :items="item.children" :depth="depth + 1" />
    </li>
  </ul>
</template>

<script setup>
defineOptions({ name: 'NavMenu' })
defineProps({
  items: { type: Array, default: () => [] },
  depth: { type: Number, default: 0 },
})
</script>

<style scoped>
.nav-menu { list-style: none; margin: 0; padding: 0; }
.nav-top { display: flex; flex-wrap: wrap; gap: 0 18px; align-items: center; }
.nav-item { position: relative; }
.nav-link { display: block; white-space: nowrap; }
.has-sub > .nav-link::after { content: ' ▾'; font-size: .7em; opacity: .6; }
.nav-sub {
  position: absolute; top: 100%; left: 0; z-index: 30; min-width: 200px; padding: 6px 0;
  background: var(--q-bg, #fff); border-radius: 10px; box-shadow: 0 10px 30px rgba(0, 0, 0, .12);
  opacity: 0; visibility: hidden; transform: translateY(4px); transition: opacity .15s, transform .15s, visibility .15s;
}
.nav-sub .nav-link { padding: 8px 16px; font-size: 15px; }
.nav-sub .nav-sub { top: 0; left: 100%; }
.nav-sub .has-sub > .nav-link::after { content: ' ›'; }
.nav-item:hover > .nav-sub,
.nav-item:focus-within > .nav-sub { opacity: 1; visibility: visible; transform: none; }
</style>
