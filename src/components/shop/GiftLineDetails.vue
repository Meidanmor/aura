<template>
  <dl class="gc-line">
    <div><dt>{{ t('To') }}</dt><dd>{{ gift.to_name }} <span class="gc-line__email">({{ gift.to_email }})</span></dd></div>
    <div v-if="gift.from"><dt>{{ t('From') }}</dt><dd>{{ gift.from }}</dd></div>
    <div><dt>{{ t('Sends') }}</dt><dd>{{ sendLabel(gift) }}</dd></div>
    <div v-if="gift.message" class="gc-line__msg"><dt>{{ t('Message') }}</dt><dd>{{ gift.message }}</dd></div>
    <div v-if="gift.design_name || gift.color">
      <dt>{{ t('Email design') }}</dt>
      <dd class="gc-line__design">
        <span v-if="gift.color" class="gc-line__dot" :style="{ background: safeColor }" aria-hidden="true" />
        <span>{{ gift.design_name }}</span>
        <img v-if="imageUrl" :src="imageUrl" alt="" class="gc-line__img" width="28" height="28">
      </dd>
    </div>
  </dl>
</template>

<script setup>
import { computed } from 'vue'
import { t } from 'src/i18n/index.js'
import { sendLabel } from 'src/utils/gift-card.js'

/** A gift card's line in the cart: everything the shopper chose (cart.addGiftCard's item.gift). */
const props = defineProps({ gift: { type: Object, required: true } })
const safeColor = computed(() => (/^#[0-9a-f]{6}$/i.test(props.gift.color || '') ? props.gift.color : 'transparent'))
const imageUrl = computed(() => (/^https:\/\//i.test(props.gift.image_url || '') ? props.gift.image_url : ''))
</script>

<style scoped>
.gc-line { display: grid; gap: 2px; margin: 4px 0; font-size: 13px; }
.gc-line > div { display: flex; gap: 6px; min-width: 0; }
.gc-line dt { opacity: .65; flex: none; }
.gc-line dt::after { content: ':'; }
.gc-line dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
.gc-line__email { opacity: .7; }
.gc-line__msg dd { white-space: pre-line; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.gc-line__design { display: inline-flex; align-items: center; gap: 6px; }
.gc-line__dot { width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 0 1px rgba(0, 0, 0, .15); }
.gc-line__img { width: 28px; height: 28px; border-radius: 4px; object-fit: cover; }
</style>
