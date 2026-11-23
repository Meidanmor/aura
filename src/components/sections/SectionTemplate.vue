<template>
  <!-- A scroll scene (Layout → When scrolling): a tall box that holds the section pinned under the header (src/utils/scroll-scene.js). -->
  <div
      v-if="scene"
      v-scene="scene.conf"
      class="sb-scene"
      :class="scene.classes"
      :style="scene.vars"
      :data-scene-id="data.id"
  >
    <SectionTemplate :data="data" :page="page" scene-pin />
  </div>
  <component
      v-else
      :is="nested ? 'div' : 'section'"
      :id="nested ? undefined : container.anchorId"
      v-bg-depth="bgDepth"
      class="sb-container"
      :class="[nested ? 'sb-nested' : 'sb-section', container.outerClasses, nested ? null : container.stickyClasses, scenePin ? 'sb-scene-pin' : null]"
      :style="outerStyle"
      v-entrance="nested || scenePin ? '' : entranceOf(data.style)"
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
        :class="[innerWidthClass, container.innerClasses, layers ? 'sc-layers' : null]"
        :style="innerStyle"
    >
      <div
          v-for="block in enabledBlocks"
          :key="block.id"
          v-entrance="sceneMode === 'story' ? '' : entranceOf(block.style)"
          :id="wrappers[block.id].anchorId"
          class="sb-block"
          :data-block-id="block.type !== 'section' ? block.id : undefined"
          :class="[wrappers[block.id].classes, sceneItems[block.id]?.classes]"
          :style="wrappers[block.id].vars"
          :data-sc="sceneItems[block.id]?.sc"
          :data-sc-speed="sceneItems[block.id]?.speed"
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
    <div v-if="scenePin && progressKind === 'line'" class="sb-scene-line" aria-hidden="true"><b /></div>
    <div v-if="scenePin && progressKind === 'dots'" class="sb-scene-dots" aria-hidden="true"><i v-for="i in sceneSteps" :key="i" :class="{ on: i === 1 }" /></div>
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
import { computed, inject, onMounted, provide } from 'vue'
import { RouterLink } from 'vue-router'
import { vEntrance } from 'src/utils/entrance.js'
import { installTilt, vBgDepth, vScene } from 'src/utils/scroll-scene.js'
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
import PostAuthorBlock from '../blocks/blog/PostAuthorBlock.vue'
import AuthorProfileBlock from '../blocks/blog/AuthorProfileBlock.vue'
import AuthorsListBlock from '../blocks/blog/AuthorsListBlock.vue'
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
import TimelineBlock from '../blocks/TimelineBlock.vue'
import PaymentIconsBlock from '../blocks/PaymentIconsBlock.vue'
import TabsBlock from '../blocks/TabsBlock.vue'
import CountdownBlock from '../blocks/CountdownBlock.vue'
import ProductGridBlock from '../blocks/ProductGridBlock.vue'
import CarouselBlock from '../blocks/CarouselBlock.vue'
import SocialLinksBlock from '../blocks/SocialLinksBlock.vue'
import SocialFeedBlock from '../blocks/SocialFeedBlock.vue'
import SocialEmbedBlock from '../blocks/SocialEmbedBlock.vue'
import SocialProfileBlock from '../blocks/SocialProfileBlock.vue'
import HtmlBlock from '../blocks/HtmlBlock.vue'
import SectionBgVideo from './SectionBgVideo.vue'
import SectionBgSlides from './SectionBgSlides.vue'
import ProductTags from './ProductTags.vue'
import MenuWidget from '../blocks/MenuWidget.vue'
import LanguageSwitcherBlock from '../blocks/LanguageSwitcherBlock.vue'
import { buildContainerStyle, buildBlockWrapperStyle, entranceOf } from 'src/composables/useSectionStyle.js'
import LoopImage from '../loops/LoopImage.vue'
import LoopText from '../loops/LoopText.vue'
import LoopPrice from '../loops/LoopPrice.vue'
import LoopStars from '../loops/LoopStars.vue'
import LoopCartButton from '../loops/LoopCartButton.vue'
import LoopAttribute from '../loops/LoopAttribute.vue'
import MiniCartBlock from "components/blocks/MiniCartBlock.vue";
import MiniWishlistBlock from "components/blocks/MiniWishlistBlock.vue";
import SearchBlock from "components/blocks/SearchBlock.vue";
import { shopBlocks } from '../blocks/shop/index.js'
import { accountBlocks } from '../blocks/account/index.js'
import AccountWidgetBlock from 'components/blocks/AccountWidgetBlock.vue'
import PersonalizedOfferBlock from 'components/blocks/PersonalizedOfferBlock.vue'
import BookingBlock from 'components/blocks/BookingBlock.vue'
import { blockOffNow } from 'src/utils/shop-mode.js'

defineOptions({ name: 'SectionTemplate' })

const props = defineProps({
  data: { type: Object, required: true },
  nested: { type: Boolean, default: false },
  // Page slug the section belongs to (home/shop/category/product) — used by
  // blocks that talk to the backend (form submissions).
  page: { type: String, default: 'home' },
  // Inside a scroll scene's tall box: this is the pinned section (the scene's own wrapper drew the box).
  scenePin: { type: Boolean, default: false },
})

const layoutActions = inject('layoutActions', null)

/* ---------- Scroll scenes (Layout → When scrolling; src/utils/scroll-scene.js) ---------- */
const SCENE_MODES = new Set(['sideways', 'story'])
const GRID_BLOCKS = new Set(['product_grid', 'category_grid', 'blog_posts', 'latest_posts', 'testimonials', 'featured_products'])
const style = computed(() => props.data.style || {})
const ownScene = computed(() => (!props.nested && SCENE_MODES.has(style.value.scene_mode) ? style.value.scene_mode : ''))
// The scene this container is part of: its own (the pinned section) or the one around it (inner sections).
const parentScene = inject('sbSceneMode', null)
const sceneMode = computed(() => (props.scenePin ? ownScene.value : (props.nested ? parentScene?.value || '' : '')))
if (props.scenePin) provide('sbSceneMode', sceneMode)

const num = (v, d) => (v === '' || v == null || !Number.isFinite(Number(v)) ? d : Number(v))
const sceneSteps = computed(() => Math.min(8, Math.max(1, Math.round(num(style.value.scene_steps, 4)))))
const progressKind = computed(() => {
  const k = style.value.scene_progress
  return k === 'line' || (k === 'dots' && ownScene.value === 'story') ? k : ''
})

const scene = computed(() => {
  if (props.scenePin || !ownScene.value) return null
  const s = style.value
  const mode = ownScene.value
  // "The same" by default (2026-11-22): a scene moves on phones too unless the owner chose otherwise.
  const phone = ['same', 'simple', 'off'].includes(s.scene_phone) ? s.scene_phone : 'same'
  const length = Math.min(8, Math.max(1, num(s.scene_length, 3)))
  const vars = {
    // A first height before the script measures (the server's HTML): a story's screens, a row's guess.
    '--sc-run': mode === 'story' ? `calc(var(--sc-stage) * ${length})` : 'calc(var(--sc-stage) * 1.5)',
  }
  const cw = s.scene_card_width
  const width = (v) => (typeof v === 'string' && /^\d+(\.\d+)?(px|%|vw|em|rem)$/.test(v.trim()) ? v.trim() : '')
  if (cw && typeof cw === 'object') {
    if (width(cw.desktop)) vars['--sc-card-w'] = width(cw.desktop)
    if (width(cw.tablet)) vars['--sc-card-w-t'] = width(cw.tablet)
    if (width(cw.mobile)) vars['--sc-card-w-m'] = width(cw.mobile)
  } else if (width(cw)) vars['--sc-card-w'] = width(cw)
  const pc = typeof s.scene_progress_color === 'string' && /^(#[0-9a-f]{3,8}|global:[a-z_]+)$/i.test(s.scene_progress_color) ? s.scene_progress_color : ''
  if (pc) vars['--sc-pc'] = pc.startsWith('global:') ? `var(--q-${pc.slice(7)})` : pc
  return {
    conf: {
      mode, length, phone,
      speed: ['slow', 'normal', 'fast'].includes(s.scene_speed) ? s.scene_speed : 'normal',
      steps: sceneSteps.value,
      bgm: s.scene_bg_motion || 'none',
      video: !!s.scene_video && mode === 'story',
      snap: !!s.scene_snap && mode === 'story',
    },
    classes: [`sb-scene--${mode}`, `sc-ph-${phone}`, s.scene_bg_motion && s.scene_bg_motion !== 'none' ? 'sc-bgm' : null],
    vars,
  }
})

// A story's inner section (or the story itself) with "Put its blocks on top of each other".
const layers = computed(() => sceneMode.value === 'story' && !!style.value.sc_layers)

/** What each child does in the scene: a story's timing (data-sc), a row's speed and grid cards. */
function sceneItem(block) {
  const mode = sceneMode.value
  if (!mode) return null
  const s = block.style || {}
  if (mode === 'story') {
    const f = Math.min(99, Math.max(0, num(s.sc_from, 0)))
    const t = Math.min(100, Math.max(f + 1, num(s.sc_to, 100)))
    const w = s.sc_while && s.sc_while !== 'none' ? s.sc_while : ''
    if (f === 0 && t === 100 && !w && !s.sc_count) return null
    const o = { f, t, i: s.sc_in || 'fade', o: s.sc_out || 'same', e: s.sc_ease || 'smooth' }
    if (w) o.w = w
    if (s.sc_count) o.c = 1
    if (w === 'custom') Object.assign(o, { mx: num(s.sc_move_x, 0), my: num(s.sc_move_y, 0), s0: num(s.sc_scale_from, 100), s1: num(s.sc_scale, 100), r: num(s.sc_rotate, 0), fo: num(s.sc_fade_to, 0) })
    // sc-later: hidden in the first paint (app.css), until the script draws the story.
    return { sc: JSON.stringify(o), classes: f > 0 ? 'sc-later' : null }
  }
  if (!props.scenePin) return null // a row's items are the section's own blocks
  const speed = ['slower', 'faster', 'fixed'].includes(s.sc_speed) ? s.sc_speed : undefined
  const cards = GRID_BLOCKS.has(block.type) && s.sc_row_cards !== 'one'
  if (!speed && !cards) return null
  return { speed, classes: cards ? 'sc-cards' : null }
}
const sceneItems = computed(() => {
  const map = {}
  if (!sceneMode.value) return map
  for (const block of enabledBlocks.value) {
    const it = sceneItem(block)
    if (it) map[block.id] = it
  }
  return map
})

// Depth While Scrolling (any section's picture / video background), not inside a scene (it has its own).
const bgDepth = computed(() => {
  const s = style.value
  if (props.nested || props.scenePin || !['gentle', 'strong'].includes(s.bg_depth)) return ''
  return ['image', 'video', 'slideshow'].includes(s.bg_type) ? s.bg_depth : ''
})
onMounted(() => { if (style.value.hover_effect === 'tilt') installTilt() })


const blockComponents = {
  personalized_offer: PersonalizedOfferBlock,
  booking: BookingBlock,
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
  post_author: PostAuthorBlock,
  author_profile: AuthorProfileBlock,
  authors_list: AuthorsListBlock,
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
  timeline: TimelineBlock,
  payment_icons: PaymentIconsBlock,
  tabs: TabsBlock,
  countdown: CountdownBlock,
  product_grid: ProductGridBlock,
  carousel: CarouselBlock,
  social_links: SocialLinksBlock,
  social_feed: SocialFeedBlock,
  social_embed: SocialEmbedBlock,
  social_profile: SocialProfileBlock,
  html_block: HtmlBlock,
  menu_widget: MenuWidget,
  language_switcher: LanguageSwitcherBlock,
  mini_cart: MiniCartBlock,
  mini_wishlist: MiniWishlistBlock,
  search: SearchBlock,
  account_widget: AccountWidgetBlock,
  // Card designs (src/components/loops): the card's own item.
  lp_image: LoopImage, lc_image: LoopImage, lpo_image: LoopImage,
  lp_title: LoopText, lp_excerpt: LoopText, lp_category: LoopText,
  lc_name: LoopText, lc_count: LoopText, lc_description: LoopText,
  lpo_title: LoopText, lpo_date: LoopText, lpo_excerpt: LoopText, lpo_category: LoopText,
  lr_text: LoopText, lr_name: LoopText, lr_verified: LoopText, lr_product: LoopText,
  lp_price: LoopPrice,
  lp_rating: LoopStars, lr_stars: LoopStars,
  lp_cart: LoopCartButton,
  lp_attribute: LoopAttribute,
  ...shopBlocks,
  ...accountBlocks,
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

// A top-level section carries its own margins (and sticky position); a nested
// one gets them from its .sb-block wrapper in the parent instead.
const outerStyle = computed(() => props.nested
    ? container.value.outerVars
    : { ...container.value.outerVars, ...container.value.marginVars, ...container.value.stickyVars })

// Content width applies to a top-level section's inner box (so its
// background stays full-bleed). A nested section's width is applied to its
// wrapper in the parent instead (buildBlockWrapperStyle()).
const innerWidthClass = computed(() => props.nested ? '' : `sb-inner--${container.value.widthMode}`)
const innerStyle = computed(() => props.nested
    ? container.value.innerVars
    : { ...container.value.innerVars, ...container.value.widthVars })

const enabledBlocks = computed(() =>
    (props.data.blocks || []).filter((block) =>
        block?.enabled !== false && (block.type === 'section' || blockComponents[block?.type]) && !blockOffNow(block.type)
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
