<template>
  <div
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
          :data="block"
          :block-id="block.id"
      />
    </div>
  </div>
</template>

<script setup>
import BannerSection from '../sections/BannerSection.vue'
import NewsletterSection from '../sections/NewsletterSection.vue'
import CategoryGridSection from '../sections/CategoryGridSection.vue'
import TestimonialsSection from '../sections/TestimonialsSection.vue'
import FeaturedProductsSection from '../sections/FeaturedProductsSection.vue'
import AdvantagesSection from '../sections/AdvantagesSection.vue'
import CtaSection from '../sections/CtaSection.vue'
import TextBlock from '../sections/TextBlock.vue'
import ImageBlock from '../sections/ImageBlock.vue'
import SpacerBlock from '../sections/SpacerBlock.vue'
import HeadingBlock from '../blocks/HeadingBlock.vue'
import ButtonBlock from '../blocks/ButtonBlock.vue'
import FormBlock from '../blocks/FormBlock.vue'
import InnerSectionBlock from '../blocks/InnerSectionBlock.vue'
import { useSectionStyle } from 'src/composables/useSectionStyle.js'
import {computed} from "vue";

const props = defineProps({ data: { type: Object, required: true } })

let { sectionClasses, sectionStyleVars } = useSectionStyle(() => props.data.style, true)

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
  button: ButtonBlock,
  form: FormBlock,
  section: InnerSectionBlock
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