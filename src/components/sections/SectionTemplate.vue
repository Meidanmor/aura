<template>
  <component
      :is="nested ? 'div' : 'section'"
      :id="nested ? undefined : container.anchorId"
      class="sb-container"
      :class="[nested ? 'sb-nested' : 'sb-section', container.outerClasses]"
      :style="outerStyle"
      :data-section-id="data.id"
  >
    <SectionBgVideo v-if="container.video" :video="container.video" />
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
        <SectionBgVideo v-if="wrappers[block.id].video" :video="wrappers[block.id].video" />
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
import LatestPostsSection from './LatestPostsSection.vue'
import PostTitleBlock from '../blocks/blog/PostTitleBlock.vue'
import PostMetaBlock from '../blocks/blog/PostMetaBlock.vue'
import PostImageBlock from '../blocks/blog/PostImageBlock.vue'
import PostContentBlock from '../blocks/blog/PostContentBlock.vue'
import PostMoreBlock from '../blocks/blog/PostMoreBlock.vue'
import PostBackBlock from '../blocks/blog/PostBackBlock.vue'
import BlogTitleBlock from '../blocks/blog/BlogTitleBlock.vue'
import BlogCategoriesBlock from '../blocks/blog/BlogCategoriesBlock.vue'
import BlogPostsBlock from '../blocks/blog/BlogPostsBlock.vue'
import AdvantagesSection from './AdvantagesSection.vue'
import TextBlock from './TextBlock.vue'
import ImageBlock from './ImageBlock.vue'
import SpacerBlock from './SpacerBlock.vue'
import HeadingBlock from '../blocks/HeadingBlock.vue'
import ButtonBlock from '../blocks/ButtonBlock.vue'
import FormBlock from '../blocks/FormBlock.vue'
import VideoBlock from '../blocks/VideoBlock.vue'
import IconListBlock from '../blocks/IconListBlock.vue'
import FaqBlock from '../blocks/FaqBlock.vue'
import TabsBlock from '../blocks/TabsBlock.vue'
import CountdownBlock from '../blocks/CountdownBlock.vue'
import ProductGridBlock from '../blocks/ProductGridBlock.vue'
import CarouselBlock from '../blocks/CarouselBlock.vue'
import SocialLinksBlock from '../blocks/SocialLinksBlock.vue'
import SectionBgVideo from './SectionBgVideo.vue'
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
  latest_posts: LatestPostsSection,
  // Blog templates (Store builder → Blog): the post or posts of the page.
  post_title: PostTitleBlock,
  post_meta: PostMetaBlock,
  post_featured_image: PostImageBlock,
  post_content: PostContentBlock,
  post_more: PostMoreBlock,
  post_back: PostBackBlock,
  blog_title: BlogTitleBlock,
  blog_categories: BlogCategoriesBlock,
  blog_posts: BlogPostsBlock,
  category_grid: CategoryGridSection,
  testimonials: TestimonialsSection,
  advantages: AdvantagesSection,
  video: VideoBlock,
  icon_list: IconListBlock,
  faq: FaqBlock,
  tabs: TabsBlock,
  countdown: CountdownBlock,
  product_grid: ProductGridBlock,
  carousel: CarouselBlock,
  social_links: SocialLinksBlock,
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
