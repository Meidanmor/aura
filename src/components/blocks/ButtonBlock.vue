<script setup>
import {computed} from "vue";
import {useRoute} from "vue-router";

const route = useRoute()

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
})

const buttonTarget = computed(() => {
  const url = props.data.data.url || ''

  if (url.startsWith('/')) {
    return {to: url}
  }

  if (url.startsWith('#')) {
    return {to: `${route.path.replace(/\/$/, '')}/${url}`}
  }

  return {
    href: url,
    target: '_blank',
    rel: 'noopener noreferrer'
  }
})

const cssVars = computed(() => {
  const vars = {}

  if (props.data?.data.text_color) {
    vars['--btn-txt-color'] = props.data.data.text_color
  }

  if (props.data?.data.bg_color) {
    vars['--btn-bg-color'] = props.data.data.bg_color
  }

  return vars
})
</script>

<template>
  <div
      :class="`btn-block flex justify-${props.data.data.alignment === 'left' ? 'start' : props.data.data.alignment === 'right' ? 'end' : props.data.data.alignment}`"
  >
  <q-btn
      outline
      :style="cssVars"
      v-if="props.data.data.text && props.data.data.url"
      v-bind="buttonTarget"
      :label="props.data.data.text"
      unelevated
  />
  </div>
</template>

<style scoped>

</style>