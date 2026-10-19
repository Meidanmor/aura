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
    <SectionBgSlides v-if="container.slideshow" :slideshow="container.slideshow" />
    <ProductTags v-if="container.tags" v-bind="container.tags" />
    <!-- "Make the whole section a link": a link covering the section, under its content (app.css .sb-cover-link). -->
    <component
        :is="container.link.internal ? RouterLink : 'a'"
        v-if="container.link"
        class="sb-cover-link"
        v-bind="coverLinkAttrs"
    />
    <div
        class="sb-inner"
        :class="[innerWidthClass, container.innerClasses]"
        :style="innerStyle"
    >
      <div
          v-for="block in enabledBlocks"
          :key="block.id"
          v-entrance="block.type !== 'section' ? block.style?.animation : ''"
          :id="wrappers[block.id].anchorId"
          class="sb-block"
          :class="wrappers[block.id].classes"
          :style="wrappers[block.id].vars"
      >
        <SectionBgVideo v-if="wrappers[block.id].video" :video="wrappers[block.id].video" />
        <SectionBgSlides v-if="wrappers[block.id].slideshow" :slideshow="wrappers[block.id].slideshow" />
        <ProductTags v-if="wrappers[block.id].tags" v-bind="wrappers[block.id].tags" />
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
            @open-menu="layoutActions?.openMobileMenu"
            @toggle-cart="layoutActions?.toggleCart"
            @toggle-wishlist="layoutActions?.toggleWishlist"
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
import { computed, inject } from 'vue'
import { RouterLink } from 'vue-router'
import { vEntrance } from 'src/utils/entrance.js'
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
import IconBlock from '../blocks/IconBlock.vue'
import RunningTextBlock from '../blocks/RunningTextBlock.vue'
import FaqBlock from '../blocks/FaqBlock.vue'
import TabsBlock from '../blocks/TabsBlock.vue'
import CountdownBlock from '../blocks/CountdownBlock.vue'
import ProductGridBlock from '../blocks/ProductGridBlock.vue'
import CarouselBlock from '../blocks/CarouselBlock.vue'
import SocialLinksBlock from '../blocks/SocialLinksBlock.vue'
import SectionBgVideo from './SectionBgVideo.vue'
import SectionBgSlides from './SectionBgSlides.vue'
import ProductTags from './ProductTags.vue'
import MenuWidget from '../blocks/MenuWidget.vue'
import LanguageSwitcherBlock from '../blocks/LanguageSwitcherBlock.vue'
import { buildContainerStyle, buildBlockWrapperStyle } from 'src/composables/useSectionStyle.js'
import LoopImage from '../loops/LoopImage.vue'
import LoopText from '../loops/LoopText.vue'
import LoopPrice from '../loops/LoopPrice.vue'
import LoopStars from '../loops/LoopStars.vue'
import LoopCartButton from '../loops/LoopCartButton.vue'
import MiniCartBlock from "components/blocks/MiniCartBlock.vue";
import MiniWishlistBlock from "components/blocks/MiniWishlistBlock.vue";

defineOptions({ name: 'SectionTemplate' })

const props = defineProps({
  data: { type: Object, required: true },
  nested: { type: Boolean, default: false },
  // Page slug the section belongs to (home/shop/category/product) — used by
  // blocks that talk to the backend (form submissions).
  page: { type: String, default: 'home' },
})

const layoutActions = inject('layoutActions', null)

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
  icon: IconBlock,
  running_text: RunningTextBlock,
  faq: FaqBlock,
  tabs: TabsBlock,
  countdown: CountdownBlock,
  product_grid: ProductGridBlock,
  carousel: CarouselBlock,
  social_links: SocialLinksBlock,
  menu_widget: MenuWidget,
  language_switcher: LanguageSwitcherBlock,
  mini_cart: MiniCartBlock,
  mini_wishlist: MiniWishlistBlock,
  // Card designs (src/components/loops): the card's own item.
  lp_image: LoopImage, lc_image: LoopImage, lpo_image: LoopImage,
  lp_title: LoopText, lp_excerpt: LoopText, lp_category: LoopText,
  lc_name: LoopText, lc_count: LoopText, lc_description: LoopText,
  lpo_title: LoopText, lpo_date: LoopText, lpo_excerpt: LoopText, lpo_category: LoopText,
  lr_text: LoopText, lr_name: LoopText, lr_verified: LoopText, lr_product: LoopText,
  lp_price: LoopPrice,
  lp_rating: LoopStars, lr_stars: LoopStars,
  lp_cart: LoopCartButton,
}

const container = computed(() => buildContainerStyle(props.data.style || {}))

const coverLinkAttrs = computed(() => {
  const link = container.value.link
  if (!link) return {}
  const attrs = link.internal ? { to: link.url } : { href: link.url }
  if (link.newTab) Object.assign(attrs, { target: '_blank', rel: link.internal ? 'noopener' : 'noopener noreferrer' })
  // Screen readers need a name for a link with no text of its own.
  attrs['aria-label'] = link.label || undefined
  return attrs
})

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
