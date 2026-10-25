<!-- src/components/AppCarousel.vue -->
<template>
  <q-carousel
    :key="carouselKey"
    v-model="slide"
    animated
    transition-prev="slide-right"
    transition-next="slide-left"
    swipeable
    :infinite="showControls"
    :navigation="showControls && dots"
    :arrows="false"
    height="auto"
    control-color="primary"
    class="rounded-borders"
    tabindex="0"
    @pointerdown.stop
    @keydown="onKeydown"
  >
    <slot />

<template v-if="showControls && dots" #navigation-icon="{ name, onClick }">
  <q-btn
    :flat="false"
    size="sm"
    round dense
    :icon="null"
    :style="{
      background: Number(slide) === Number(name) ? 'var(--q-secondary)' : '#9e9e9e',
      fontSize: '5px',
      padding: 0
    }"
    :aria-label="t('Go to slide {n}', { n: name + 1 })"
    @click="onClick"
  />
</template>

    <template v-if="showControls && arrows" #control>
      <q-carousel-control position="left" class="flex items-center">
        <q-btn flat dense color="secondary"
          :aria-label="t('Previous slide')"
          @click="slide = (slide - 1 + total) % total"
        >
          <svg viewBox="8.59 6 7.41 12" xmlns="http://www.w3.org/2000/svg">
            <path fill="var(--q-secondary)" d="M14.59 6L16 7.41 11.42 12l4.58 4.59L14.59 18 8.59 12z"/>
          </svg>
        </q-btn>
      </q-carousel-control>
      <q-carousel-control position="right" class="flex items-center">
        <q-btn flat dense color="secondary"
          :aria-label="t('Next slide')"
          @click="slide = (slide + 1) % total"
        >
          <svg viewBox="8.59 6 7.41 12" xmlns="http://www.w3.org/2000/svg">
            <path fill="var(--q-secondary)" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </q-btn>
      </q-carousel-control>
    </template>
  </q-carousel>
</template>

<script setup>
defineProps({
  carouselKey: Number,
  showControls: Boolean,
  total:        Number,
  onKeydown:    Function,
  // The Product Photos block can hide either one (a Product Thumbnails block replaces the dots).
  arrows:       { type: Boolean, default: true },
  dots:         { type: Boolean, default: true },
})

const slide = defineModel()
</script>

<style scoped>
/* Right-to-left pages: the previous arrow sits on the right, so both chevrons point the other way.
   The transitions are named above on purpose: Quasar's own defaults swap them on RTL pages,
   and postcss-rtlcss mirrors the slide CSS again, which made slides move the wrong way. */
[dir="rtl"] .q-carousel__control svg { transform: scaleX(-1); }
</style>