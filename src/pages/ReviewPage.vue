<template>
  <div class="review-page q-pa-md">
    <div v-if="loading" class="q-pa-xl flex justify-center"><q-spinner color="secondary" size="3em" /></div>

    <div v-else-if="error" class="q-pa-lg">
      <h1 class="text-h5">{{ t('This link doesn\'t work') }}</h1>
      <p>{{ error }}</p>
      <q-btn color="secondary" :label="t('Go to the store')" to="/" />
    </div>

    <div v-else-if="info" class="review-page-card">
      <div class="review-page-product">
        <img v-if="info.product.image" :src="info.product.image" :alt="info.product.name" width="96" height="96">
        <div>
          <p class="text-caption q-mb-xs">{{ info.name ? t('Hi {name}, how was it?', { name: info.name }) : t('How was it?') }}</p>
          <h1 class="text-h5 q-my-none">{{ info.product.name }}</h1>
        </div>
      </div>

      <p v-if="sent" class="q-mt-lg" role="status">{{ sent }}</p>
      <p v-else-if="!info.enabled" class="q-mt-lg">{{ t('This store isn\'t collecting reviews right now.') }}</p>
      <p v-else-if="info.reviewed" class="q-mt-lg">{{ t('You\'ve already reviewed this product. Thank you!') }}</p>
      <ReviewForm v-else class="q-mt-lg" :product-id="info.product.id" :order-id="route.query.o" :token="String(route.query.t || '')" :cancelable="false" @sent="(m) => (sent = m)" />

      <q-btn v-if="sent || info.reviewed" class="q-mt-md" flat color="secondary" :label="t('See the product')" :to="`/product/${info.product.slug}`" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useMeta } from 'quasar'
import { fetchWithToken } from 'src/composables/useApiFetch.js'
import ReviewForm from 'components/shop/ReviewForm.vue'
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()

/** Writing a review from the link in the "How was your order?" email. */
const route = useRoute()
const info = ref(null)
const loading = ref(true)
const error = ref('')
const sent = ref('')

// A private link: never indexed.
useMeta({ title: t('Write a review'), meta: { robots: { name: 'robots', content: 'noindex, nofollow', key: 'robots' } } })

onMounted(async () => {
  const { o, p, t } = route.query
  if (!o || !p || !t) {
    error.value = t('Open the link from your email again.')
    loading.value = false
    return
  }
  try {
    const res = await fetchWithToken(`/wp-json/qwoo/v1/reviews/request?${new URLSearchParams({ o, p, t })}`)
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(t(json?.message || 'This review link isn\'t valid any more.'))
    info.value = json
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.review-page { max-width: 640px; margin: 0 auto; }
.review-page-card { padding: 8px 0 32px; }
.review-page-product { display: flex; align-items: center; gap: 16px; }
.review-page-product img { width: 96px; height: 96px; object-fit: cover; border-radius: 12px; flex: none; }
</style>
