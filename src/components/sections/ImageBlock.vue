<template>
  <div v-if="images.length" class="image-block" :class="`image-block--${props.data.data.layout || 'row'}`">
    <component
        :is="img.link_url ? 'a' : 'span'"
        v-for="(img, idx) in images"
        :key="idx"
        :href="img.link_url || undefined"
        class="image-block__item"
    >
      <img :src="img.image" :alt="img.alt || ''" loading="lazy" />
    </component>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, required: true },
})

const images = computed(() => props.data.data.images || [])
</script>

<style scoped>
.image-block { display: flex; gap: 16px; }
.image-block--row { /*flex-wrap: wrap;*/ align-items: center; justify-content: center; }
.image-block--stacked { flex-direction: column; align-items: center; }
.image-block--grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
.image-block__item { width: 100%}
.image-block__item img { max-width: 100%; display: block; margin: 0 auto }
</style>