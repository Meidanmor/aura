<template>
  <section v-if="data.categories?.length" class="category-grid-section">
    <div class="container">
      <h2 v-if="data.title" class="q-mb-lg text-center" v-html="sanitizeSectionText(data.title)" />
      <div class="row q-col-gutter-md">
        <div v-for="cat in data.categories" :key="cat.id" class="col-6 col-md-3">
          <q-btn flat no-caps :to="`/products?category=${cat.slug}`" class="category-grid-card">
            <img v-if="cat.image" :src="cat.image" :alt="cat.name" loading="lazy" />
            <span>{{ cat.name }}</span>
          </q-btn>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
// Expects `data.categories` to already be resolved (id/name/slug/image) —
// see src/utils/resolve-sections-data.js, called from Index.vue's
// preFetch(), which turns the raw `category_ids` saved by the WP admin
// into real category objects server-side (same pattern as
// resolveFeaturedProducts for the Featured Products section).
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'

defineProps({
  data: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.category-grid-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
}

.category-grid-card img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 8px;
}
</style>