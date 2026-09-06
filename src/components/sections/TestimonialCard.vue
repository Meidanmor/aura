<template>
  <q-card flat bordered class="testimonial-card">
    <q-card-section>
      <div class="testimonial-card__rating">
        <q-icon
            v-for="n in 5"
            :key="n"
            name="star"
            :color="n <= testimonial.rating ? 'amber' : 'grey-4'"
            size="18px"
        />
      </div>

      <p class="testimonial-card__text">{{ testimonial.review_text }}</p>

      <div class="testimonial-card__name">{{ testimonial.name }}</div>
    </q-card-section>
  </q-card>
</template>

<script setup>
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