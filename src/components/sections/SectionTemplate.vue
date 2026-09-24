<template>
  <section
      :class="sectionClasses"
      :style="sectionStyleVars"
      :section-id="data.id"
  >
    <div
        v-for="block in enabledBlocks" :key="block.id"
        class="sb-block"
        :style="blockStyleVarsById[block.id]"
    >

    <component
        :is="blockComponents[block.type]"
        :data="block.data"
        :block-id="block.id"
    />
    </div>
  </section>
</template>

<script setup>
import BannerSection from './BannerSection.vue'
import NewsletterSection from './NewsletterSection.vue'
import CategoryGridSection from './CategoryGridSection.vue'
import TestimonialsSection from './TestimonialsSection.vue'
import FeaturedProductsSection from './FeaturedProductsSection.vue'
import AdvantagesSection from './AdvantagesSection.vue'
import CtaSection from './CtaSection.vue'
import TextBlock from './TextBlock.vue'
import ImageBlock from './ImageBlock.vue'
import SpacerBlock from './SpacerBlock.vue'
import HeadingBlock from '../blocks/HeadingBlock.vue'
import ButtonBlock from '../blocks/ButtonBlock.vue'
import { useSectionStyle } from 'src/composables/useSectionStyle.js'
import {computed} from "vue";

const props = defineProps({ data: { type: Object, required: true } })

const { sectionClasses, sectionStyleVars } = useSectionStyle(() => props.data.style)

const blockComponents = {
  banner: BannerSection,
  newsletter_signup: NewsletterSection,
  category_grid: CategoryGridSection,
  testimonials: TestimonialsSection,
  featured_products: FeaturedProductsSection,
  advantages: AdvantagesSection,
  cta: CtaSection,
  text_block: TextBlock,
  image_block: ImageBlock,
  spacer: SpacerBlock,
  heading: HeadingBlock,
  button: ButtonBlock
}
const enabledBlocks = computed(() =>
    (props.data.blocks || []).filter(
        (block) => block?.enabled && blockComponents[block?.type]
    )
)

const toCssLength = (v) => {
  if (v === '' || v == null) return null
  return /^-?\d+(\.\d+)?$/.test(String(v).trim()) ? `${v}px` : v
}

const blockStyleVarsById = computed(() => {
  const map = {}
  for (const block of props.data.blocks) {
    const style = block.style || {}
    const vars = {}
    const fields = {
      '--sb-pt': style.padding_top,
      '--sb-pt-m': style.padding_top_mobile ? style.padding_top_mobile : style.padding_top,
      '--sb-pb': style.padding_bottom,
      '--sb-pb-m': style.padding_bottom_mobile ? style.padding_bottom_mobile : style.padding_bottom
    }
    for (const [key, raw] of Object.entries(fields)) {
      const v = toCssLength(raw)
      if (v) vars[key] = v
    }
    map[block.id] = vars
  }
  return map
})


</script>