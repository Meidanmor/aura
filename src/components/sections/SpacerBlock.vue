<template>
  <div class="spacer-block" :class="`spacer-block--${data.height || 'medium'}`" aria-hidden="true" />
</template>

<script setup>
defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, required: true },
})
</script>

<style scoped>
.spacer-block--small { height: 24px; }
.spacer-block--medium { height: 48px; }
.spacer-block--large { height: 96px; }
</style>