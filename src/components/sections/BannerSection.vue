<template>
  <section
      class="banner-section"
      :style="{ backgroundColor: data.bg_color || undefined, color: data.text_color || undefined }"
  >
    <div class="container banner-section__inner">
      <p class="banner-section__text" v-html="sanitizeSectionText(data.text)" />
      <q-btn
          v-if="data.link_text && data.link_url"
          :label="data.link_text"
          v-bind="linkTarget"
          flat
          class="banner-section__link"
      />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'

const props = defineProps({
  data: {
    type: Object,
    required: true
  }
})

const linkTarget = computed(() => {
  const url = props.data.link_url || ''
  return url.startsWith('/')
      ? { to: url }
      : { href: url, target: '_blank', rel: 'noopener noreferrer' }
})
</script>

<style scoped>
.banner-section {
  padding: 14px 0;
}

.banner-section__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  text-align: center;
}

.banner-section__text {
  margin: 0;
}
</style>