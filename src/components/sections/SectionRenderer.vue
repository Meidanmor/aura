<template>
  <SectionTemplate
      v-for="section in visibleSections"
      :key="section.id"
      :data="section"
      :page="page"
  />
</template>

<script setup>
import { computed, provide, useSSRContext } from 'vue'
import SectionTemplate from './SectionTemplate.vue'
import { pagePriority, preloadLinks } from 'src/utils/priority-image.js'

const props = defineProps({
  sections: { type: Array, default: () => [] },
  // Only render sections pinned to this hook slot (shop/category/product pages).
  location: { type: String, default: null },
  // Page slug these sections belong to (home/shop/category/product).
  page: { type: String, default: 'home' },
  // Something else comes first on the page (the old homepage hero): no section image is first.
  noPriority: { type: Boolean, default: false },
})

const visibleSections = computed(() =>
    (props.sections || [])
        .filter((s) => s && s.enabled !== false)
        .filter((s) => props.location == null || s.location === props.location)
)

// The page's first image (src/utils/priority-image.js). Every renderer of a
// page gets the same full list, so they all agree on it; blocks ask by id.
const priority = computed(() => (props.noPriority ? null : pagePriority(props.sections, props.page)))
provide('sbPriority', priority)

// The server preloads it from the page's <head> (render.js), and the header
// logo stops competing with it.
if (process.env.SERVER && priority.value?.any) {
  const ssrContext = useSSRContext()
  if (ssrContext) {
    ssrContext.sectionPriority = true
    ssrContext.priorityImages = [...(ssrContext.priorityImages || []), ...preloadLinks(priority.value)]
  }
}
</script>
