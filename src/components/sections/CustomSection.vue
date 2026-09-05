<template>
  <section
      class="custom-section"
      :class="isTwoColumn ? 'custom-section--two-col' : 'custom-section--one-col'"
      :style="sectionStyle"
  >
    <div
        v-if="data.bg_image"
        class="custom-section__bg"
        :style="{ backgroundImage: `url(${data.bg_image})` }"
        aria-hidden="true"
    />

    <div class="container custom-section__inner">
      <div class="custom-section__content">
        <span
            v-if="data.pretitle"
            class="custom-section__pretitle"
            v-html="sanitizeSectionText(data.pretitle)"
        />
        <h2
            v-if="data.title"
            class="custom-section__title"
            v-html="sanitizeSectionText(data.title)"
        />
        <p
            v-if="data.text"
            class="custom-section__text"
            v-html="sanitizeSectionText(data.text)"
        />

        <q-btn
            v-if="data.button_text && data.button_url"
            :label="data.button_text"
            v-bind="buttonTarget"
            class="custom-section__btn"
            :style="buttonStyle"
            unelevated
        />
      </div>

      <div v-if="isTwoColumn && data.image" class="custom-section__image">
        <img :src="data.image" :alt="data.title || ''" loading="lazy" />
      </div>
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

const isTwoColumn = computed(() => props.data.layout === 'two_column')

// Internal links (starting with "/") use Vue Router's :to so navigation
// doesn't trigger a full page reload; anything else (external URLs,
// mailto:, tel:, #anchors) uses a plain href.
const buttonTarget = computed(() => {
  const url = props.data.button_url || ''
  return url.startsWith('/')
      ? { to: url }
      : { href: url, target: url.startsWith('#') ? undefined : '_blank', rel: 'noopener noreferrer' }
})

const sectionStyle = computed(() => ({
  backgroundColor: props.data.bg_color || undefined,
  color: props.data.text_color || undefined
}))

const buttonStyle = computed(() => ({
  backgroundColor: props.data.button_bg_color || undefined,
  color: props.data.button_text_color || undefined
}))
</script>

<style scoped>
.custom-section {
  position: relative;
  padding: 64px 0;
  overflow: hidden;
}

.custom-section__bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  z-index: 0;
}

.custom-section__inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 48px;
}

.custom-section--one-col .custom-section__inner {
  flex-direction: column;
  text-align: center;
  max-width: 720px;
}

.custom-section--two-col .custom-section__inner {
  flex-direction: row;
}

@media (max-width: 767px) {
  .custom-section--two-col .custom-section__inner {
    flex-direction: column;
    text-align: center;
  }
}

.custom-section__content {
  flex: 1;
  min-width: 0;
}

.custom-section__image {
  flex: 1;
  min-width: 0;
}

.custom-section__image img {
  width: 100%;
  height: auto;
  border-radius: 8px;
  display: block;
}

.custom-section__pretitle {
  display: block;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.85rem;
  opacity: 0.7;
  margin-bottom: 8px;
}

.custom-section__title {
  margin: 0 0 12px;
}

.custom-section__text {
  margin: 0 0 24px;
  line-height: 1.6;
}
</style>