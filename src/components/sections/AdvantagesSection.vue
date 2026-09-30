<template>
  <div
       v-if="blockData.items?.length"
       class="container advantages-section"
       :style="cssVars"
  >
      <div class="row justify-center gap">

        <div
            v-for="(item, index) in blockData.items"
            :key="index"
            class="advantage-card col-12 col-sm-6 col-md-4">
            <img
                v-if="item.icon === 'custom' && customIconUrl(item)"
                :src="customIconUrl(item)"
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
</template>

<script setup>
import { computed } from 'vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
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
  blockId: { type: String, default: '' },
})

// Computed (not a one-time read) so live-preview edits stay reactive.
const blockData = computed(() => props.data.data || {})

// Custom icons are { url, width, height } (schema v3); older JSON had a plain URL.
const customIconUrl = (item) => (typeof item.custom_icon === 'string' ? item.custom_icon : item.custom_icon?.url) || ''

const cssVars = computed(() => ({
  '--advantage-icon-color': resolveGlobalColor(blockData.value.icon_color) || 'var(--q-secondary)',
  '--advantage-text-color': resolveGlobalColor(blockData.value.text_color) || 'var(--q-secondary)'
}))
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
    width: calc(100% / 3 - 40px / 3);
  }
}
</style>