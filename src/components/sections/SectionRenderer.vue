<template>
  <template v-for="section in props.sections" :key="section.id">
    <component
      :is="sectionTemplate"
      :data="section"
      />
  </template>
</template>

<script setup>
import SectionTemplate from './SectionTemplate.vue'

const props = defineProps({
  sections: { type: Array, default: () => [] },
  location: { type: String, default: null }
})

const sectionTemplate = SectionTemplate

</script>