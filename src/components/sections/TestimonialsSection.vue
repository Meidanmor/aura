<template>
  <section v-if="data.items?.length" class="testimonials-section">
    <div class="container">
      <h2 v-if="data.title" class="q-mb-lg text-center" v-html="sanitizeSectionText(data.title)" />
      <div class="row q-col-gutter-md">
        <div
            v-for="(testimonial, index) in data.items"
            :key="index"
            class="col-12 col-md-4"
        >
          <div class="q-card q-pa-md">
            <article itemscope itemtype="https://schema.org/Review" class="text-center">
              <h3
                  class="text-subtitle1 q-mb-sm"
                  itemprop="author"
                  itemscope
                  itemtype="https://schema.org/Person"
              >
                <span itemprop="name" v-html="sanitizeSectionText(testimonial.name)" />
              </h3>
              <p itemprop="reviewBody" class="text-body2 text-text" v-html="sanitizeSectionText(testimonial.review_text)" />
            </article>
          </div>
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
  }
})
</script>