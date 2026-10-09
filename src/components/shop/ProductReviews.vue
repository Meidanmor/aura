<template>
  <section id="reviews" class="product-reviews q-mt-xl" aria-labelledby="reviews-title">
    <h2 id="reviews-title" class="text-h5 q-mb-md">{{ t('Reviews') }}</h2>

    <div v-if="loading && !data" class="q-pa-md"><q-spinner color="secondary" size="2em" /></div>

    <template v-else-if="data?.enabled">
      <div v-if="data.count" class="reviews-summary q-mb-lg">
        <div class="reviews-average">
          <b class="text-h3">{{ data.average.toFixed(1) }}</b>
          <q-rating :model-value="data.average" readonly size="1.4em" color="amber" :icon="matStarBorder" :icon-selected="matStar" :icon-half="matStarHalf" />
          <span class="text-caption">{{ data.count }} {{ data.count === 1 ? 'review' : 'reviews' }}</span>
        </div>
        <ul class="reviews-bars" :aria-label="t('Reviews by stars')">
          <li v-for="n in [5, 4, 3, 2, 1]" :key="n">
            <span>{{ n }} ★</span>
            <span class="reviews-bar"><i :style="{ width: `${data.count ? (data.stars[n] / data.count) * 100 : 0}%` }" /></span>
            <span class="text-caption">{{ data.stars[n] }}</span>
          </li>
        </ul>
      </div>
      <p v-else class="q-mb-md">{{ t('No reviews yet.') }}</p>

      <!-- Writing one: verified buyers only. -->
      <div class="reviews-write q-mb-lg">
        <p v-if="sent" class="reviews-note" role="status">{{ sent }}</p>
        <template v-else-if="data.can === 'ok'">
          <q-btn v-if="!writing" color="secondary" :label="t('Write a review')" @click="writing = true" />
          <ReviewForm v-else :product-id="productId" @sent="onSent" @cancel="writing = false" />
        </template>
        <p v-else-if="data.can === 'login'" class="reviews-note">{{ t('Bought this?') }} <router-link to="/my-account">{{ t('Sign in') }}</router-link> {{ t('to write a review.') }}</p>
        <p v-else-if="data.can === 'not_bought'" class="reviews-note">{{ t('Only customers who bought this product can review it.') }}</p>
        <p v-else-if="data.can === 'reviewed'" class="reviews-note">{{ t('Thanks for your review!') }}</p>
      </div>

      <ul class="reviews-list">
        <li v-for="r in items" :key="r.id" class="review">
          <div class="review-head">
            <q-rating :model-value="r.rating" readonly size="1em" color="amber" :icon="matStarBorder" :icon-selected="matStar" :aria-label="t('{n} out of 5 stars', { n: r.rating })" />
            <b v-if="r.title">{{ r.title }}</b>
          </div>
          <p class="review-text">{{ r.text }}</p>
          <p class="text-caption review-meta">
            {{ r.author }} · {{ formatDate(r.date) }}<span v-if="r.verified" class="review-verified"> {{ t('· ✓ Verified buyer') }}</span>
          </p>
          <div v-if="r.reply" class="review-reply">
            <b class="text-caption">{{ t('Reply from the store') }}</b>
            <p class="review-text">{{ r.reply.text }}</p>
          </div>
        </li>
      </ul>
      <q-btn v-if="page < data.pages" flat color="secondary" :label="t('Show more reviews')" :loading="loading" @click="more" />
      <p v-if="error" class="text-negative">{{ error }}</p>
    </template>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { matStar, matStarBorder, matStarHalf } from '@quasar/extras/material-icons'
import { fetchWithToken } from 'src/composables/useApiFetch.js'
import ReviewForm from 'components/shop/ReviewForm.vue'
import { currentLocale, useI18n } from 'src/i18n/index.js'

const { t } = useI18n()

/** The product page's reviews (shown when the store turned reviews on). Loads in the browser. */
const props = defineProps({ productId: { type: Number, required: true } })

const data = ref(null)
const items = ref([])
const page = ref(1)
const loading = ref(false)
const error = ref('')
const writing = ref(false)
const sent = ref('')

async function load(p = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await fetchWithToken(`/wp-json/qwoo/v1/reviews?product=${props.productId}&page=${p}`)
    const json = await res.json()
    if (!res.ok) throw new Error(t(json?.message || 'Reviews could not be loaded.'))
    data.value = json
    items.value = p === 1 ? json.items || [] : [...items.value, ...(json.items || [])]
    page.value = p
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
const more = () => load(page.value + 1)

function onSent(message) {
  writing.value = false
  sent.value = message
}

const formatDate = (seconds) => new Date(seconds * 1000).toLocaleDateString(currentLocale(), { year: 'numeric', month: 'short', day: 'numeric' })

onMounted(() => load(1))
</script>

<style scoped>
.product-reviews { max-width: 820px; }
.reviews-summary { display: flex; flex-wrap: wrap; gap: 24px 40px; align-items: center; }
.reviews-average { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
.reviews-average b { line-height: 1; }
.reviews-bars { list-style: none; margin: 0; padding: 0; min-width: 220px; flex: 1; max-width: 360px; }
.reviews-bars li { display: grid; grid-template-columns: 34px 1fr 28px; align-items: center; gap: 8px; font-size: 14px; }
.reviews-bar { height: 8px; border-radius: 99px; background: rgba(0, 0, 0, .08); overflow: hidden; }
.reviews-bar i { display: block; height: 100%; background: #f2b01e; }
.reviews-note { margin: 0; }
.reviews-list { list-style: none; margin: 0; padding: 0; }
.review { padding: 16px 0; border-top: 1px solid rgba(0, 0, 0, .1); }
.review-head { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
.review-text { margin: 6px 0 0; white-space: pre-line; overflow-wrap: anywhere; }
.review-meta { margin: 6px 0 0; opacity: .75; }
.review-reply { margin-top: 10px; padding: 8px 12px; border-left: 3px solid currentColor; opacity: .9; }
</style>
