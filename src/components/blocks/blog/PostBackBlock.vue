<template>
  <router-link to="/blog" class="post-back" v-bind="linkText">{{ d.label || t('← Blog') }}</router-link>
</template>

<script setup>
import { computed } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/** "Back To Blog Link" (blog post template). */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const d = computed(() => props.data.data || {})
const linkText = computed(() => textStyle(d.value, tsKeys('link')))
</script>

<style scoped>
.post-back { display: inline-block; color: inherit; text-decoration: none; opacity: .75; }
.post-back:hover { opacity: 1; text-decoration: underline; }
</style>
