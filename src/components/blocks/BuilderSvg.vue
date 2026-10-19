<template>
  <!-- An owner's icon: its SVG code in the page when the store published it (it can take the
       text colour), else a mask that paints it in the text colour, else the plain image. -->
  <span
      v-if="svg"
      class="qsvg"
      :role="alt ? 'img' : undefined"
      :aria-label="alt || undefined"
      :aria-hidden="alt ? undefined : 'true'"
      v-html="svg"
  />
  <span
      v-else-if="recolor && mask"
      class="qsvg qsvg-mask"
      :style="{ '--qsvg-url': mask }"
      :role="alt ? 'img' : undefined"
      :aria-label="alt || undefined"
      :aria-hidden="alt ? undefined : 'true'"
  />
  <img v-else-if="url" class="qsvg-img" :src="url" :alt="alt" loading="lazy" decoding="async" />
</template>

<script setup>
import { computed } from 'vue'
import { safeSvg, imageUrl, cssUrl } from 'src/utils/inline-svg.js'

const props = defineProps({
  image: { type: [Object, String], default: null },
  // Paint it in the text colour (Icon Color) when there's no SVG code.
  recolor: { type: Boolean, default: false },
  alt: { type: String, default: '' },
})

const svg = computed(() => safeSvg(props.image))
const url = computed(() => imageUrl(props.image))
const mask = computed(() => cssUrl(url.value))
</script>

<style>
.qsvg { display: inline-block; line-height: 0; }
.qsvg > svg { display: block; width: 100%; height: 100%; }
.qsvg-mask {
  background: currentColor;
  -webkit-mask: var(--qsvg-url) center / contain no-repeat;
  mask: var(--qsvg-url) center / contain no-repeat;
}
.qsvg-img { object-fit: contain; }
</style>
