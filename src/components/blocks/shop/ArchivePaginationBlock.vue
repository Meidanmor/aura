<template>
  <span v-if="false" />
</template>

<script setup>
/**
 * The old "Page Numbers" block: page numbers are the Products Grid's own now (Pagination).
 * The store removes this block from the list; a config published before that still has it: nothing shows.
 */
defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
</script>
