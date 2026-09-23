<template>
  <q-card flat bordered class="testimonial-card">
        <div class="q-card q-pa-md">
          <article
              itemscope
              itemtype="https://schema.org/Review"
              class="text-center"
          >
            <!-- Author -->
            <h3
                class="text-subtitle1 q-mb-sm"
                itemprop="author"
                itemscope
                itemtype="https://schema.org/Person"
            >
              <span itemprop="name">{{ testimonial.name }}</span>

            </h3>

            <!-- Rating -->
            <div
                itemprop="reviewRating"
                itemscope
                itemtype="https://schema.org/Rating"
                class="q-mb-sm"
            >
              <meta itemprop="ratingValue" :content="testimonial.rating" />
              <meta itemprop="bestRating" content="5" />

              <q-rating
                  :model-value="testimonial.rating ?? 0"
                  size="20px"
                  color="amber"
                  :icon="matStar"
                  readonly
              />
            </div>

            <!-- Review text -->
            <p itemprop="reviewBody" class="text-body2 text-text">
              {{ testimonial.review_text }}
            </p>
          </article>
        </div>
  </q-card>
</template>

<script setup>
import { matStar } from '@quasar/extras/material-icons'

defineProps({
  testimonial: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.testimonial-card {
  height: 100%;
}

.testimonial-card__rating {
  margin-bottom: 8px;
}

.testimonial-card__text {
  font-style: italic;
  line-height: 1.5;
  margin-bottom: 12px;
}

.testimonial-card__name {
  font-weight: 600;
}
</style>