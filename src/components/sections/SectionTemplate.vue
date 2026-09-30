<template>
  <component
      :is="nested ? 'div' : 'section'"
      :id="nested ? undefined : container.anchorId"
      class="sb-container"
      :class="[nested ? 'sb-nested' : 'sb-section', container.outerClasses]"
      :style="outerStyle"
      :data-section-id="data.id"
  >
    <div
        class="sb-inner"
        :class="[innerWidthClass, container.innerClasses]"
        :style="innerStyle"
    >
      <div
          v-for="block in enabledBlocks"
          :key="block.id"
          :id="wrappers[block.id].anchorId"
          class="sb-block"
          :class="wrappers[block.id].classes"
          :style="wrappers[block.id].vars"
      >
        <SectionTemplate
            v-if="block.type === 'section'"
            :data="block"
            :page="page"
            nested
        />
        <component
            :is="blockComponents[block.type]"
            v-else
            :data="block"
            :block-id="block.id"
            :page="page"
        />
      </div>
    </div>
  </component>
</template>

<script setup>
/**
 * Renders one Shop Builder container — a top-level section (`<section>`)
 * or, recursively, a nested `section` block (`<div>`, `nested` prop).
 * Container styling comes from buildContainerStyle(); each child block is
 * wrapped in a `.sb-block` carrying its spacing/width/visibility (see
 * buildBlockWrapperStyle() and the .sb-* rules in src/css/app.css).
 *
 * To add a block type: register its component in `blockComponents`.
 */
import { computed } from 'vue'
import CategoryGridSection from './CategoryGridSection.vue'
import TestimonialsSection from './TestimonialsSection.vue'
import FeaturedProductsSection from './FeaturedProductsSection.vue'
import AdvantagesSection from './AdvantagesSection.vue'
import TextBlock from './TextBlock.vue'
import ImageBlock from './ImageBlock.vue'
import SpacerBlock from './SpacerBlock.vue'
import HeadingBlock from '../blocks/HeadingBlock.vue'
import ButtonBlock from '../blocks/ButtonBlock.vue'
import FormBlock from '../blocks/FormBlock.vue'
import { buildContainerStyle, buildBlockWrapperStyle } from 'src/composables/useSectionStyle.js'

defineOptions({ name: 'SectionTemplate' })

const props = defineProps({
  data: { type: Object, required: true },
  nested: { type: Boolean, default: false },
  // Page slug the section belongs to (home/shop/category/product) — used by
  // blocks that talk to the backend (form submissions).
  page: { type: String, default: 'home' },
})

const blockComponents = {
  heading: HeadingBlock,
  text_block: TextBlock,
  image_block: ImageBlock,
  button: ButtonBlock,
  spacer: SpacerBlock,
  form: FormBlock,
  featured_products: FeaturedProductsSection,
  category_grid: CategoryGridSection,
  testimonials: TestimonialsSection,
  advantages: AdvantagesSection,
}

const container = computed(() => buildContainerStyle(props.data.style || {}))

// A top-level section carries its own margins; a nested one gets them
// from its .sb-block wrapper in the parent instead.
const outerStyle = computed(() => props.nested
    ? container.value.outerVars
    : { ...container.value.outerVars, ...container.value.marginVars })

// Content width applies to a top-level section's inner box (so its
// background stays full-bleed). A nested section's width is applied to its
// wrapper in the parent instead (buildBlockWrapperStyle()).
const innerWidthClass = computed(() => props.nested ? '' : `sb-inner--${container.value.widthMode}`)
const innerStyle = computed(() => props.nested
    ? container.value.innerVars
    : { ...container.value.innerVars, ...container.value.widthVars })

const enabledBlocks = computed(() =>
    (props.data.blocks || []).filter((block) =>
        block?.enabled !== false && (block.type === 'section' || blockComponents[block?.type])
    )
)

const wrappers = computed(() => {
  const map = {}
  for (const block of enabledBlocks.value) {
    map[block.id] = buildBlockWrapperStyle(block)
  }
  return map
})
</script>
