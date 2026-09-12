<template>
  <section
      class="banner-section"
      :style="cssVars"
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
  },
  sectionId: {
    type: String,
    default: ''
  },
  sectionBg: {
    type: String,
    default: ''
  }
})

const linkTarget = computed(() => {
  const url = props.data.link_url || ''
  return url.startsWith('/')
      ? { to: url }
      : { href: url, target: '_blank', rel: 'noopener noreferrer' }
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
  if(props.data.text_color){
    vars['color'] = props.data.text_color
  }
  return vars
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