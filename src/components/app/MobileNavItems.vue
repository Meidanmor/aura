<template>
  <!-- The header menu in the phone drawer: items with sub-items expand in place. -->
  <template v-for="(item, i) in items" :key="i">
    <q-expansion-item
      v-if="item.children?.length"
      :label="item.label"
      :header-inset-level="depth * 0.5"
      expand-separator
      dense-toggle
    >
      <q-item clickable v-ripple :inset-level="(depth + 1) * 0.5" v-bind="linkProps(item)" @click="emit('navigate')">
        <q-item-section>{{ item.label }}</q-item-section>
      </q-item>
      <MobileNavItems :items="item.children" :depth="depth + 1" @navigate="emit('navigate')" />
    </q-expansion-item>
    <q-item v-else clickable v-ripple :inset-level="depth * 0.5" v-bind="linkProps(item)" @click="emit('navigate')">
      <q-item-section>{{ item.label }}</q-item-section>
    </q-item>
  </template>
</template>

<script setup>
defineOptions({ name: 'MobileNavItems' })
defineProps({
  items: { type: Array, default: () => [] },
  depth: { type: Number, default: 0 },
})
const emit = defineEmits(['navigate'])

// Store addresses go through the router; anything else is a normal link.
const linkProps = (item) =>
  item.external
    ? { href: item.url, tag: 'a', target: item.new_tab ? '_blank' : undefined, rel: item.new_tab ? 'noopener' : undefined }
    : { to: item.url }
</script>
