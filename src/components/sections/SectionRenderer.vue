<template>
  <SectionTemplate
      v-for="section in visibleSections"
      :key="section.id"
      :data="section"
      :page="page"
  />
</template>

<script setup>
import { computed } from 'vue'
import SectionTemplate from './SectionTemplate.vue'

const props = defineProps({
  sections: { type: Array, default: () => [] },
  // Only render sections pinned to this hook slot (shop/category/product pages).
  location: { type: String, default: null },
  // Page slug these sections belong to (home/shop/category/product).
  page: { type: String, default: 'home' },
})

const visibleSections = computed(() =>
    (props.sections || [])
        .filter((s) => s && s.enabled !== false)
        .filter((s) => props.location == null || s.location === props.location)
)
</script>
