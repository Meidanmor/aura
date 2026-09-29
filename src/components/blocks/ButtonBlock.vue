<script setup>
import {computed} from "vue";

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
})

const buttonTarget = computed(() => {
  const url = props.data.url || ''
  return url.startsWith('/')
      ? { to: url }
      : { href: url, target: url.startsWith('#') ? undefined : '_blank', rel: 'noopener noreferrer' }
})
const cssVars = computed(() => {
  const vars = {}
  if (props.data?.text_color) {
    vars['--btn-txt-color'] = props.data.text_color
  }
  if (props.data?.bg_color) {
    vars['--btn-bg-color'] = props.data.bg_color
  }

  return vars
})

</script>

<template>
  <div
      :class="`btn-block flex justify-${props.data.alignment === 'left' ? 'start' : props.data.alignment === 'right' ? 'end' : props.data.alignment}`"
  >
  <q-btn
      outline
      :style="cssVars"
      v-if="props.data.text && props.data.url"
      v-bind="buttonTarget"
      :label="props.data.text"
      unelevated
  />
  </div>
</template>

<style scoped>

</style>