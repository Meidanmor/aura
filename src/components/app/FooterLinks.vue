<template>
  <!-- A footer column's links (Design → Menus); links under a link are indented. -->
  <ul class="footer-links" :class="{ nested: depth }" role="list">
    <li v-for="(item, i) in items" :key="i">
      <a v-if="item.external" :href="item.url" :target="item.new_tab ? '_blank' : null" :rel="item.new_tab ? 'noopener' : null">{{ item.label }}</a>
      <router-link v-else :to="item.url" :target="item.new_tab ? '_blank' : null">{{ item.label }}</router-link>
      <FooterLinks v-if="item.children?.length" :items="item.children" :depth="depth + 1" />
    </li>
  </ul>
</template>

<script setup>
defineOptions({ name: 'FooterLinks' })
defineProps({
  items: { type: Array, default: () => [] },
  depth: { type: Number, default: 0 },
})
</script>

<style scoped>
.footer-links { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: inherit; }
.footer-links.nested { padding-inline-start: 12px; margin-top: 6px; }
</style>
