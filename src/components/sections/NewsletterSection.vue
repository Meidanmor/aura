<template>
  <section class="newsletter-section">
    <div class="container text-center">
      <h2 class="q-mb-md" v-html="sanitizeSectionText(data.title || 'Join the List')" />
      <p v-if="data.subtitle" class="text-body1 q-mb-lg" v-html="sanitizeSectionText(data.subtitle)" />
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
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { matWarning, matCheckCircle } from '@quasar/extras/material-icons'
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'

defineProps({
  data: {
    type: Object,
    required: true
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
</script>