<template>
  <template v-for="section in enabledSections" :key="section.id">
    <component
        v-if="section?.enabled"
      :is="sectionTemplate"
      :data="section"
      />
  </template>
</template>

<script setup>
import SectionTemplate from './SectionTemplate.vue'
import {computed} from "vue";

const props = defineProps({
  sections: { type: Array, default: () => [] },
  location: { type: String, default: null }
})

const sectionTemplate = SectionTemplate

const enabledSections = computed(() =>
    (props.sections || [])
        .filter(s => s?.enabled)
        .filter(s => props.location == null || s.location === props.location)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
)

</script>