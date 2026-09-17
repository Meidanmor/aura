<template>
  <section
      :class="sectionClasses"
      :style="sectionStyleVars"
      :section-id="data.id"
  >
    <component
        v-for="block in data.blocks" :key="block.id"
        :is="sectionComponents[block.type]"
        :data="block.data"
        :block-id="block.id"
    />
  </section>
</template>

<script setup>
import BannerSection from './BannerSection.vue'
import NewsletterSection from './NewsletterSection.vue'
import CategoryGridSection from './CategoryGridSection.vue'
import TestimonialsSection from './TestimonialsSection.vue'
import CustomSection from './CustomSection.vue'
import FeaturedProductsSection from './FeaturedProductsSection.vue'
import AdvantagesSection from './AdvantagesSection.vue'
import CtaSection from './CtaSection.vue'
import TextBlock from './TextBlock.vue'
import ImageBlock from './ImageBlock.vue'
import SpacerBlock from './SpacerBlock.vue'
import HeadingBlock from '../blocks/HeadingBlock.vue'
import { useSectionStyle } from 'src/composables/useSectionStyle.js'

const props = defineProps({ data: { type: Object, required: true } })

const { sectionClasses, sectionStyleVars } = useSectionStyle(props.data.style)

const sectionComponents = {
  banner: BannerSection,
  newsletter_signup: NewsletterSection,
  category_grid: CategoryGridSection,
  testimonials: TestimonialsSection,
  custom: CustomSection,
  featured_products: FeaturedProductsSection,
  advantages: AdvantagesSection,
  cta: CtaSection,
  text_block: TextBlock,
  image_block: ImageBlock,
  spacer: SpacerBlock,
  heading: HeadingBlock
}
</script>