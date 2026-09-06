<template>
  <section v-if="data.title || data.image" class="cta-section">
    <div class="container">
      <div class="row items-center q-col-gutter-xl">
        <div v-if="data.image" class="col-12 col-md-6">
          <img :src="data.image" :alt="data.title || ''" class="cta-section__image" />
        </div>

        <div class="col-12" :class="data.image ? 'col-md-6' : ''">
          <div v-if="data.pretitle" class="cta-section__pretitle">{{ data.pretitle }}</div>
          <h2 v-if="data.title" class="cta-section__title" v-html="sanitizeSectionText(data.title)" />
          <div v-if="data.text" class="cta-section__text" v-html="sanitizeSectionText(data.text)" />
          <q-btn
              v-if="data.button_text && data.button_url"
              :to="data.button_url"
              :label="data.button_text"
              color="primary"
              unelevated
              class="cta-section__button"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'

defineProps({
  data: {
    type: Object,
    required: true
  },
  sectionId: { type: String, default: '' }
})
</script>

<style scoped>
.cta-section__image {
  width: 100%;
  height: auto;
  border-radius: 8px;
}

.cta-section__pretitle {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 8px;
}

.cta-section__title {
  margin: 0 0 16px;
}

.cta-section__text {
  margin: 0 0 24px;
  line-height: 1.6;
}
</style>