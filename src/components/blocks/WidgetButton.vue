<template>
  <q-btn
      flat
      dense
      no-caps
      class="widget-btn"
      :class="sizeClasses"
      :style="vars"
      :to="to || undefined"
      :aria-label="ariaLabel"
      :data-action="action || undefined"
      @click="onClick"
  >
    <span class="widget-btn__inner">
      <span class="widget-btn__icon" :class="{ 'has-color': !!iconColor }">
        <img v-if="d.icon === 'custom' && customUrl" :src="customUrl" alt="" class="widget-btn__img" decoding="async" />
        <q-icon v-else :name="icons[d.icon] || defaultIcon" />
        <q-no-ssr>
          <q-badge v-if="count > 0" floating class="widget-btn__badge" :style="badgeStyle">{{ count }}</q-badge>
        </q-no-ssr>
      </span>
      <span v-if="d.label || $slots.extra" class="widget-btn__text" v-bind="labelText">
        <span v-if="d.label">{{ d.label }}</span>
        <slot name="extra" />
      </span>
    </span>
  </q-btn>
</template>

<script setup>
/**
 * The button of a header widget (Mini Cart, Mini Wishlist, the Menu's phone
 * button): a built-in or the owner's own icon, its size and color, an
 * optional text (with its text style), and a count badge.
 *
 * Fields (class-sb-constants.php): icon, custom_icon, label, icon_size,
 * icon_color, badge_bg, badge_color, label_* (text style).
 */
import { computed } from 'vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { asResponsive, setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

const props = defineProps({
  d: { type: Object, required: true },
  icons: { type: Object, required: true },
  defaultIcon: { type: String, required: true },
  ariaLabel: { type: String, default: '' },
  action: { type: String, default: '' },
  count: { type: Number, default: 0 },
  to: { type: String, default: '' },
})
const emit = defineEmits(['click'])

const customUrl = computed(() => (typeof props.d.custom_icon === 'string' ? props.d.custom_icon : props.d.custom_icon?.url) || '')
const iconColor = computed(() => resolveGlobalColor(props.d.icon_color) || '')
const labelText = computed(() => textStyle(props.d, tsKeys('label')))

const vars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--wb-icon', props.d.icon_size, toCssLength)
  if (iconColor.value) v['--wb-icon-color'] = iconColor.value
  return v
})
const sizeClasses = computed(() => {
  const s = asResponsive(props.d.icon_size)
  return { 'wb-size-d': !!s.desktop, 'wb-size-t': !!s.tablet, 'wb-size-m': !!s.mobile }
})
const badgeStyle = computed(() => ({
  background: resolveGlobalColor(props.d.badge_bg) || 'var(--q-negative, #c10015)',
  color: resolveGlobalColor(props.d.badge_color) || '#fff',
}))

function onClick(e) {
  if (!props.to) emit('click', e)
}
</script>

<style scoped>
.widget-btn__inner { display: inline-flex; align-items: center; gap: 8px; }
.widget-btn__icon { position: relative; display: inline-flex; font-size: 24px; line-height: 1; }
.widget-btn__icon.has-color { color: var(--wb-icon-color); }
.widget-btn__icon.has-color :deep(svg) { fill: var(--wb-icon-color); }
.widget-btn__img { width: 1em; height: 1em; object-fit: contain; }
.widget-btn__text { display: inline-flex; align-items: baseline; gap: 6px; white-space: nowrap; }
.widget-btn__badge { top: -6px; right: -8px; font-size: 11px; }

@media (min-width: 1024px) {
  .wb-size-d .widget-btn__icon { font-size: var(--wb-icon); }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .wb-size-t .widget-btn__icon { font-size: var(--wb-icon-t); }
}
@media (max-width: 767px) {
  .wb-size-m .widget-btn__icon { font-size: var(--wb-icon-m); }
}
</style>
