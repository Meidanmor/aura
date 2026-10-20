<template>
  <ArchivePagination v-if="a" v-model="a.currentPage" :total-pages="a.totalPages" @page-change="a.scrollToTop" />
</template>

<script setup>
import { inject } from 'vue'
import ArchivePagination from 'components/shop/ArchivePagination.vue'

/** "Page Numbers" (All products / category page template). */
defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const a = inject('productArchive', null)
</script>
