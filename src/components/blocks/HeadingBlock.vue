<template>
  <div
      :class="['heading-block', data.alignment && `text-${data.alignment}`]"
      :style="{ color: data.color || undefined }"
  >
    <component v-if="data.title" :is="data.tag">
    {{ data.title }}
  </component>
  <p v-if="data.subtitle">
    {{ data.subtitle }}
  </p>
  </div>
</template>

<script setup>

defineProps({
  data: {
    type: Object,
    required: true
  },
})
</script>