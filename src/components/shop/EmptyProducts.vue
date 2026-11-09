<template>
  <!-- A products block with nothing to show ("Recently viewed" before any product was
       viewed): the owner's message, or nothing (the block, or the whole section, hidden). -->
  <div v-if="empty && action === 'message' && d.empty_text" class="empty-products">{{ d.empty_text }}</div>
  <span v-else-if="empty && action === 'hide_section'" ref="marker" hidden />
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  // The block's data: empty_action ('message' | 'hide_block' | 'hide_section'), empty_text.
  d: { type: Object, required: true },
  empty: { type: Boolean, default: false },
})
const action = computed(() => (['message', 'hide_block', 'hide_section'].includes(props.d.empty_action) ? props.d.empty_action : 'hide_section'))

// "Hide the section": the section holding the block (its wrapper when it's inside another
// section). Known in the browser only, so set on the element after the page is drawn.
const marker = ref(null)
let hidden = null
function restore() {
  if (hidden) hidden.style.removeProperty('display')
  hidden = null
}
watch(marker, (el) => {
  restore()
  if (!el) return
  let target = el.closest('.sb-container')
  if (target?.parentElement?.classList.contains('sb-block')) target = target.parentElement
  if (!target) return
  target.style.display = 'none'
  hidden = target
}, { flush: 'post' })
onBeforeUnmount(restore)
</script>

<style scoped>
.empty-products { opacity: .75; padding: 8px 0; }
</style>
