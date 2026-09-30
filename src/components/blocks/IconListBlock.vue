<template>
  <ul v-if="items.length" class="icon-list" :class="layoutClasses" :style="cssVars">
    <li v-for="(item, idx) in items" :key="idx" class="icon-list__item">
      <component
          :is="item.link_url ? linkTag(item.link_url) : 'span'"
          v-bind="item.link_url ? linkAttrs(item.link_url) : {}"
          class="icon-list__row"
      >
        <img
            v-if="item.icon === 'custom' && customUrl(item)"
            :src="customUrl(item)"
            alt=""
            class="icon-list__icon icon-list__icon--img"
            loading="lazy"
        />
        <q-icon v-else :name="generalIcons[item.icon] || generalIcons.check" class="icon-list__icon" aria-hidden="true" />
        <span class="icon-list__text">{{ item.text }}</span>
      </component>
    </li>
  </ul>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { generalIcons } from 'src/utils/builder-icons.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { asResponsive, setResponsiveVar, toCssLength, alignToFlex } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

const d = computed(() => props.data.data || {})
const items = computed(() => (d.value.items || []).filter((i) => i.text))

const customUrl = (item) => (typeof item.custom_icon === 'string' ? item.custom_icon : item.custom_icon?.url) || ''

const isInternal = (url) => url.startsWith('/') && !url.startsWith('//')
const linkTag = (url) => (isInternal(url) ? RouterLink : 'a')
const linkAttrs = (url) => (isInternal(url) ? { to: url } : { href: url })

const layoutClasses = computed(() => {
  const layout = asResponsive(d.value.layout || 'vertical')
  return {
    'il-h-d': layout.desktop === 'horizontal',
    'il-h-t': layout.tablet === 'horizontal',
    'il-h-m': layout.mobile === 'horizontal',
    'il-divider': !!d.value.divider,
  }
})

const cssVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--il-icon', d.value.icon_size || '20px', toCssLength)
  setResponsiveVar(vars, '--il-size', d.value.font_size, toCssLength)
  setResponsiveVar(vars, '--il-gap', d.value.gap, toCssLength)
  setResponsiveVar(vars, '--il-align', d.value.alignment, alignToFlex)
  const iconColor = resolveGlobalColor(d.value.icon_color)
  if (iconColor) vars['--il-icon-color'] = iconColor
  const textColor = resolveGlobalColor(d.value.text_color)
  if (textColor) vars['--il-text-color'] = textColor
  return vars
})
</script>

<style scoped>
.icon-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: var(--il-align, flex-start);
  gap: var(--il-gap, 12px);
  color: var(--il-text-color, inherit);
  font-size: var(--il-size, inherit);
}
.icon-list__row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
}
a.icon-list__row:hover .icon-list__text { text-decoration: underline; }
.icon-list__icon {
  flex: 0 0 auto;
  font-size: var(--il-icon, 20px);
  width: var(--il-icon, 20px);
  height: var(--il-icon, 20px);
  color: var(--il-icon-color, currentColor);
}
.icon-list__icon--img { object-fit: contain; }
.il-divider .icon-list__item + .icon-list__item { border-top: 1px solid rgba(0, 0, 0, 0.1); padding-top: var(--il-gap, 12px); }

@media (min-width: 1024px) {
  .il-h-d { flex-direction: row; flex-wrap: wrap; justify-content: var(--il-align, flex-start); align-items: center; }
  .il-h-d.il-divider .icon-list__item + .icon-list__item { border-top: 0; padding-top: 0; border-left: 1px solid rgba(0, 0, 0, 0.1); padding-left: var(--il-gap, 12px); }
}
@media (max-width: 1023px) {
  .icon-list { gap: var(--il-gap-t, 12px); align-items: var(--il-align-t, flex-start); font-size: var(--il-size-t, inherit); }
  .icon-list__icon { font-size: var(--il-icon-t, 20px); width: var(--il-icon-t, 20px); height: var(--il-icon-t, 20px); }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .il-h-t { flex-direction: row; flex-wrap: wrap; justify-content: var(--il-align-t, flex-start); align-items: center; }
  .il-h-t.il-divider .icon-list__item + .icon-list__item { border-top: 0; padding-top: 0; border-left: 1px solid rgba(0, 0, 0, 0.1); padding-left: var(--il-gap-t, 12px); }
}
@media (max-width: 767px) {
  .icon-list { gap: var(--il-gap-m, 12px); align-items: var(--il-align-m, flex-start); font-size: var(--il-size-m, inherit); }
  .icon-list__icon { font-size: var(--il-icon-m, 20px); width: var(--il-icon-m, 20px); height: var(--il-icon-m, 20px); }
  .il-h-m { flex-direction: row; flex-wrap: wrap; justify-content: var(--il-align-m, flex-start); align-items: center; }
  .il-h-m.il-divider .icon-list__item + .icon-list__item { border-top: 0; padding-top: 0; border-left: 1px solid rgba(0, 0, 0, 0.1); padding-left: var(--il-gap-m, 12px); }
}
</style>
