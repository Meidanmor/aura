<template>
  <section
      v-if="data.items?.length"
      class="advantages-section"
      :style="cssVars"
  >
  <div class="container">
      <div class="row justify-center">

        <div
            v-for="(item, index) in data.items"
            :key="index"
            class="advantage-card col-12 col-sm-6 col-md-4">
            <img
                v-if="item.icon === 'custom' && item.custom_icon"
                :src="item.custom_icon"
                :alt="item.title || ''"
                class="advantage-card__icon advantage-card__icon--custom"
                loading="lazy"
            />
            <q-icon
                v-else
                :name="iconMap[item.icon] || iconMap.shipping"
                size="40px"
                class="advantage-card__icon"
            />
            <span v-if="item.title" class="advantage-card__title">{{ item.title }}</span>
            <p v-if="item.text" class="advantage-card__text">{{ item.text }}</p>
          </div>
        </div>
      </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { matLocalShipping, matSpa, matVerified, matAssignmentReturn, matSupportAgent, matWorkspacePremium } from '@quasar/extras/material-icons'

const iconMap = {
  shipping: matLocalShipping,
  organic: matSpa,
  guarantee: matVerified,
  returns: matAssignmentReturn,
  support: matSupportAgent,
  quality: matWorkspacePremium
}

const props = defineProps({
  data: { type: Object, required: true },
  sectionId: { type: String, default: '' },
  sectionBg: { type: String, default: '' }
})

// Maps the CMS's "global:xyz" tokens to actual CSS var references.
// Anything else (e.g. a raw hex from the admin) is passed through as-is.
const resolveSectionBg = (bg) => {
  if (!bg) return ''
  const map = {
    'global:primary': 'var(--q-primary)',
    'global:secondary': 'var(--q-secondary)',
    'global:accent': 'var(--q-accent)',
    'global:text': 'var(--q-text)'
  }
  return map[bg] || bg
}

const cssVars = computed(() => {
  const vars = {
    '--advantage-icon-color': props.data.icon_color || 'var(--q-secondary)',
    '--advantage-text-color': props.data.text_color || 'var(--q-secondary)'
  }
  const resolvedBg = resolveSectionBg(props.sectionBg)
  if (resolvedBg) {
    vars['--section-bg'] = resolvedBg
  }
  return vars
})
</script>

<style scoped>
.advantage-card {
  display: flex;
  flex-direction: column;
  gap: 10px
}

.advantage-card__icon {
  margin-bottom: 12px;
  color: var(--advantage-icon-color);
}

.advantage-card__icon--custom {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.advantage-card__title {
  text-transform: uppercase;
  margin: 0 0 8px;
  color: var(--advantage-text-color);
}

.advantage-card__text {
  margin: 0;
  color: var(--advantage-text-color);
}
@media(min-width: 768px){
  .advantage-card {
    text-align: center;
  }
}
@media(max-width: 767px) {
  .advantage-card {
    margin-bottom: 20px;
    border-bottom: 1px solid var(--advantage-text-color);
    width: 100%;
  }
}
@media(min-width: 768px) {
  .advantage-card {
    justify-content: center;
    align-items: center;
    text-align: center;
    width: calc(100% / 3);
  }
}
</style>