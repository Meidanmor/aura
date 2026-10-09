<template>
  <q-form class="review-form" @submit.prevent="send">
    <div class="q-mb-sm">
      <div id="review-stars-label" class="text-subtitle2">{{ t('Your rating') }}</div>
      <q-rating v-model="rating" size="2em" color="amber" :icon="matStarBorder" :icon-selected="matStar" aria-labelledby="review-stars-label" />
    </div>
    <q-input v-model="title" outlined dense :label="t('Title (optional)')" maxlength="100" class="q-mb-sm" />
    <q-input v-model="text" outlined type="textarea" autogrow :label="t('Your review')" maxlength="3000" counter class="q-mb-sm" :rules="[(v) => (v || '').trim().length >= 3 || t('Write a few words')]" />
    <p v-if="error" class="text-negative" role="alert">{{ error }}</p>
    <div class="row items-center q-gutter-sm">
      <q-btn type="submit" color="secondary" :label="t('Send review')" :loading="busy" :disable="!rating" />
      <q-btn v-if="cancelable" flat :label="t('Cancel')" @click="$emit('cancel')" />
    </div>
    <p class="text-caption q-mt-sm">{{ t('Your first name and last initial show with your review, after the store approves it.') }}</p>
  </q-form>
</template>

<script setup>
import { ref } from 'vue'
import { matStar, matStarBorder } from '@quasar/extras/material-icons'
import { fetchWithToken } from 'src/composables/useApiFetch.js'
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()

/**
 * Writing a review: signed in (the store checks the purchase), or from the
 * review-request email (orderId + token).
 */
const props = defineProps({
  productId: { type: Number, required: true },
  orderId: { type: [Number, String], default: '' },
  token: { type: String, default: '' },
  cancelable: { type: Boolean, default: true },
})
const emit = defineEmits(['sent', 'cancel'])

const rating = ref(0)
const title = ref('')
const text = ref('')
const busy = ref(false)
const error = ref('')

async function send() {
  if (!rating.value) {
    error.value = 'Choose from 1 to 5 stars.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    const res = await fetchWithToken('/wp-json/qwoo/v1/reviews', {
      method: 'POST',
      body: JSON.stringify({
        product_id: props.productId,
        rating: rating.value,
        title: title.value,
        text: text.value,
        ...(props.token ? { order: props.orderId, token: props.token } : {}),
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(t(json?.message || 'The review could not be sent. Please try again.'))
    emit('sent', t(json.message || 'Thanks! Your review will show once the store approves it.'))
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>
