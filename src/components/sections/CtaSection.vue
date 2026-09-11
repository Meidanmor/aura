<template>
  <section :style="cssVars" v-if="props.data.title || props.data.image" class="cta-section">
    <div class="container">
      <div class="row items-center q-col-gutter-xl">
        <div v-if="props.data.image" class="col-12 col-md-6">
          <img :src="props.data.image" :alt="props.data.title || ''" class="cta-section__image" width="400" height="400" />
        </div>

        <div class="col-12" :class="props.data.image ? 'col-md-6' : ''">
          <div v-if="props.data.pretitle" class="cta-section__pretitle">{{ props.data.pretitle }}</div>
          <h2 v-if="props.data.title" class="cta-section__title" v-html="sanitizeSectionText(props.data.title)" />
          <div v-if="props.data.text" class="cta-section__text" v-html="sanitizeSectionText(props.data.text)" />
          <q-btn
              v-if="props.data.button_text && props.data.button_url"
              v-bind="buttonTarget"
              :label="props.data.button_text"
              text-color="black"
              unelevated
              class="cta-section__button btn-styled"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'
import {computed} from "vue";

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  sectionId: { type: String, default: '' },
  sectionBg: { type: String, default: '' }
})

const resolveSectionBg = (bg) => {
  if (!bg) return ''
  const map = {
    'global:primary': 'var(--q-primary)',
    'global:secondary': 'var(--q-secondary)',
    'global:accent': 'var(--q-accent)',
    'global:text': 'var(--q-text)'
  }
  return map[bg] || bg
}

const cssVars = computed(() => {
  const vars = {}
  const resolvedBg = resolveSectionBg(props.sectionBg)
  if (resolvedBg) {
    vars['--section-bg'] = resolvedBg
  }
  return vars
})

const buttonTarget = computed(() => {
  const url = props.data?.button_url || ''
  return url.startsWith('/')
      ? { to: url }
      : { href: url, target: url.startsWith('#') ? undefined : '_blank', rel: 'noopener noreferrer' }
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