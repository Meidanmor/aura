<template>
  <header v-if="a" class="archive-title" :class="`is-${align}`" :style="{ textAlign: align }">
    <component :is="tag" v-if="a.mode === 'category'" :class="titleText.class" :style="titleText.style"><span v-html="a.safeCategoryName || t('Products')"></span></component>
    <component :is="tag" v-else :class="titleText.class" :style="titleText.style">{{ d.title || t('Products') }}</component>
    <div v-if="d.show_description && description" class="archive-title-intro" :class="descText.class" :style="descText.style" v-html="description"></div>
  </header>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { useSanitizedDescription } from 'src/composables/useSanitizedHtml'

/** "Page Title" (All products / category page template): the title, the category's name on its page. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const a = inject('productArchive', null)
const d = computed(() => props.data.data || {})
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const descText = computed(() => textStyle(d.value, tsKeys('desc')))
const tag = computed(() => (d.value.tag === 'h2' ? 'h2' : 'h1'))
const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'start'))
const description = useSanitizedDescription(() => (a?.mode === 'category' ? a.selectedCategoryOBJ?.description : ''))
</script>

<style scoped>
.archive-title h1, .archive-title h2 { margin: 20px 0; }
.archive-title-intro { margin: -8px 0 20px; max-width: 65ch; opacity: .85; }
.archive-title.is-center .archive-title-intro { margin-inline: auto; }
/* rtl:begin:ignore */
.archive-title.is-right .archive-title-intro { margin-left: auto; }
/* rtl:end:ignore */
</style>
