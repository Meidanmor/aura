<template>
  <router-link to="/blog" class="post-back">{{ d.label || '← Blog' }}</router-link>
</template>

<script setup>
import { computed } from 'vue'

/** "Back To Blog Link" (blog post template). */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' } })
const d = computed(() => props.data.data || {})
</script>

<style scoped>
.post-back { display: inline-block; color: inherit; text-decoration: none; opacity: .75; }
.post-back:hover { opacity: 1; text-decoration: underline; }
</style>
