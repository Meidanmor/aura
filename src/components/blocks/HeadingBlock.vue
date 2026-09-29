<template>
  <div
      :block-id="data.id"
      :class="['heading-block', data.data.alignment && `text-${data.data.alignment}`]"
      :style="{ color: data.data.color || undefined }"
  >
    <component v-if="data.data.title" :is="data.data.tag">
    {{ sanitizeSectionText(data.data.title) }}
  </component>
  <p v-if="data.data.subtitle">
    {{ data.data.subtitle }}
  </p>
  </div>
</template>

<script setup>
import {sanitizeSectionText} from "src/utils/sanitizeSectionText.js";

defineProps({
  data: {
    type: Object,
    required: true
  },
})
</script>