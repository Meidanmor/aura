<template>
  <section v-if="data.items?.length" class="advantages-section" :style="cssVars">
    <div class="container">
      <div class="row q-col-gutter-md">
        <div
            v-for="(item, index) in data.items"
            :key="index"
            class="col-12 col-sm-6 col-md-4"
        >
          <div class="advantage-card">
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
            <h3 v-if="item.title" class="advantage-card__title">{{ item.title }}</h3>
            <p v-if="item.text" class="advantage-card__text">{{ item.text }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { matLocalShipping, matVerified, matAssignmentReturn, matSupportAgent, matWorkspacePremium } from '@quasar/extras/material-icons'

// Keys must match Shop_Settings_Builder::ADVANTAGE_ICONS on the WP side.
// "custom" is handled separately above (renders the uploaded image instead).
const iconMap = {
  shipping: matLocalShipping,
  organic: 'matEco',
  guarantee: matVerified,
  returns: matAssignmentReturn,
  support: matSupportAgent,
  quality: matWorkspacePremium
}

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  sectionId: {
    type: String,
    default: ''
  }
})

// Section-wide colors (not per-card), applied via CSS custom properties so
// the scoped stylesheet below stays the single source of truth for layout.
const cssVars = computed(() => ({
  '--advantage-icon-color': props.data.icon_color || '#1976D2',
  '--advantage-text-color': props.data.text_color || '#111111'
}))
</script>

<style scoped>
.advantage-card {
  text-align: center;
  padding: 24px 16px;
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
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--advantage-text-color);
}

.advantage-card__text {
  margin: 0;
  color: var(--advantage-text-color);
}
</style>