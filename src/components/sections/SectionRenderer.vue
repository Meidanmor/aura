<template>
  <template v-for="section in enabledSections" :key="section.id">
    <component
        :class="section.location === 'before_products_grid' || section.location === 'after_products_grid' ? 'dynamic-sections' : ''"
        :is="sectionComponents[section.type]"
        :data="section.data"
        :section-id="section.id"
        :section-bg="section?.section_bg_color"
    />
  </template>
</template>


<script setup>
/**
 * Renders the CMS-configurable "Homepage Sections" from the Shop Builder
 * plugin (home.json -> sections[]). Add a new entry to `sectionComponents`
 * whenever a new section `type` is added on the WP side (SECTION_SCHEMA in
 * class-shop-settings.php) — unknown types are silently skipped rather than
 * throwing, since the WP admin already only lets whitelisted types through.
 */
import { computed } from 'vue'
import BannerSection from './BannerSection.vue'
import NewsletterSection from './NewsletterSection.vue'
import CategoryGridSection from './CategoryGridSection.vue'
import TestimonialsSection from './TestimonialsSection.vue'
import CustomSection from './CustomSection.vue'
import FeaturedProductsSection from './FeaturedProductsSection.vue'
import AdvantagesSection from './AdvantagesSection.vue'
import CtaSection from './CtaSection.vue'

const props = defineProps({
  sections: {
    type: Array,
    default: () => []
  },
  location: { type: String, default: null } // null = render everything, in array order (home page behavior)

})

const sectionComponents = {
  banner: BannerSection,
  newsletter_signup: NewsletterSection,
  category_grid: CategoryGridSection,
  testimonials: TestimonialsSection,
  custom: CustomSection,
  featured_products: FeaturedProductsSection,
  advantages: AdvantagesSection,
  cta: CtaSection
}

const enabledSections = computed(() =>
    (props.sections || [])
        .filter(s => s?.enabled && sectionComponents[s?.type])
        .filter(s => props.location == null || s.location === props.location)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
)

</script>