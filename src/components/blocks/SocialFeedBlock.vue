<template>
  <div class="social-feed">
    <div v-if="d.handle || d.profile_url" class="social-feed__head">
      <b v-if="d.handle" dir="ltr">{{ d.handle }}</b>
      <a v-if="d.profile_url" class="social-feed__follow" :href="d.profile_url" target="_blank" rel="noopener noreferrer">{{ d.button_label || t('Follow us') }}</a>
    </div>
    <!-- The Image(s) block draws the grid, with its product tags ("shop the look") and hover effects. -->
    <ImageBlock :data="images" :block-id="blockId" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ImageBlock from '../sections/ImageBlock.vue'

/**
 * Social Gallery: the owner's own posts as a grid, each one linking to the post
 * or tagged with products, with a Follow button. Works today with any account:
 * the photos are the owner's, so no approval from Instagram or TikTok is needed,
 * and nothing loads from their servers.
 */
const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})
const d = computed(() => props.data.data || {})
const images = computed(() => ({
  ...props.data,
  data: {
    layout: { desktop: 'grid', tablet: 'grid', mobile: 'grid' },
    hover_effect: 'zoom',
    image_width: { desktop: '100%', tablet: '100%', mobile: '100%' },
    image_max_width: { desktop: '100%', tablet: '100%', mobile: '100%' },
    ...d.value,
  },
}))
</script>

<style scoped>
.social-feed__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.social-feed__follow { display: inline-block; padding: 8px 18px; border: 1px solid currentColor; border-radius: 99px; color: inherit; text-decoration: none; font-weight: 600; }
</style>
