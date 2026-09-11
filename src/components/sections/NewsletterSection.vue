<template>
  <section :style="cssVars"  class="newsletter-section">
    <div class="container text-center">
      <h2 class="q-mb-md" v-html="sanitizeSectionText(props.data.title || 'Join the List')" />
      <p v-if="props.data.subtitle" class="text-body1 q-mb-lg" v-html="sanitizeSectionText(props.data.subtitle)" />
      <q-input filled v-model="email" label="Your email address" class="subscribe-email-input q-mb-md" />
      <q-btn
          class="q-plr-lg"
          size="lg"
          :label="data.button_text || 'Subscribe'"
          color="secondary"
          text-color="primary"
          @click="subscribe"
      />
    </div>
  </section>
</template>

<script setup>
import {computed, ref} from 'vue'
import { useQuasar } from 'quasar'
import { matWarning, matCheckCircle } from '@quasar/extras/material-icons'
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

const $q = useQuasar()
const email = ref('')

function subscribe() {
  if (email.value) {
    $q.notify({ type: 'positive', message: 'Subscribed successfully!', icon: matWarning })
    email.value = ''
  } else {
    $q.notify({ type: 'negative', message: 'Please enter a valid email.', icon: matCheckCircle })
  }
}

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
</script>