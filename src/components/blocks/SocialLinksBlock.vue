<template>
  <ul
      v-if="links.length"
      class="social-links"
      :class="[`social-links--${d.shape || 'circle'}`, { 'social-links--labels': d.display === 'icon_label' }]"
      :style="cssVars"
  >
    <li v-for="link in links" :key="link.key">
      <a
          :href="link.href"
          class="social-links__link"
          :style="link.style"
          :target="link.external && d.new_tab !== false ? '_blank' : undefined"
          :rel="link.external && d.new_tab !== false ? 'noopener noreferrer' : undefined"
          :aria-label="d.display === 'icon_label' ? undefined : link.label"
      >
        <span class="social-links__icon"><q-icon :name="link.icon" aria-hidden="true" /></span>
        <span v-if="d.display === 'icon_label'" class="social-links__label">{{ link.label }}</span>
      </a>
    </li>
  </ul>
</template>

<script setup>
import { computed } from 'vue'
import { socialNetworks, socialHref } from 'src/utils/builder-icons.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { setResponsiveVar, toCssLength, alignToFlex } from 'src/composables/useSectionStyle.js'
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

const d = computed(() => props.data.data || {})

const links = computed(() => (d.value.items || []).map((item, i) => {
  const net = socialNetworks[item.network] || socialNetworks.website
  const href = socialHref(item.network, item.url)
  if (!href) return null
  const style = {}
  if (d.value.color_mode === 'brand') {
    // Brand color as the shape (or as the icon when there's no shape).
    if ((d.value.shape || 'circle') === 'none') style['--sl-icon'] = net.color
    else { style['--sl-bg'] = net.color; style['--sl-icon'] = net.fg || '#fff' }
  }
  return {
    key: `${i}-${item.network}`,
    href,
    icon: net.icon,
    label: item.label || t(net.label),
    external: /^https?:/i.test(href),
    style,
  }
}).filter(Boolean))

const cssVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--sl-size', d.value.icon_size || '18px', toCssLength)
  setResponsiveVar(vars, '--sl-gap', d.value.gap, toCssLength)
  setResponsiveVar(vars, '--sl-align', d.value.alignment, alignToFlex)
  if (d.value.color_mode !== 'brand') {
    const icon = resolveGlobalColor(d.value.icon_color)
    const bg = resolveGlobalColor(d.value.bg_color)
    if (icon) vars['--sl-icon'] = icon
    if (bg) vars['--sl-bg'] = bg
  }
  return vars
})
</script>

<style scoped>
.social-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: var(--sl-align, flex-start);
  gap: var(--sl-gap, 10px);
}
.social-links__link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: inherit;
  text-decoration: none;
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.social-links__link:hover { transform: translateY(-2px); }
.social-links__link:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; border-radius: 6px; }
.social-links__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--sl-size, 18px);
  color: var(--sl-icon, #fff);
}
.social-links--circle .social-links__icon,
.social-links--rounded .social-links__icon,
.social-links--square .social-links__icon {
  width: calc(var(--sl-size, 18px) * 2.1);
  height: calc(var(--sl-size, 18px) * 2.1);
  background: var(--sl-bg, var(--q-secondary));
}
.social-links--circle .social-links__icon { border-radius: 50%; }
.social-links--rounded .social-links__icon { border-radius: 8px; }
.social-links--none .social-links__icon { color: var(--sl-icon, currentColor); }
.social-links__label { font-weight: 500; }

@media (max-width: 1023px) {
  .social-links { gap: var(--sl-gap-t, 10px); justify-content: var(--sl-align-t, flex-start); }
  .social-links__icon { font-size: var(--sl-size-t, 18px); }
  .social-links--circle .social-links__icon,
  .social-links--rounded .social-links__icon,
  .social-links--square .social-links__icon { width: calc(var(--sl-size-t, 18px) * 2.1); height: calc(var(--sl-size-t, 18px) * 2.1); }
}
@media (max-width: 767px) {
  .social-links { gap: var(--sl-gap-m, 10px); justify-content: var(--sl-align-m, flex-start); }
  .social-links__icon { font-size: var(--sl-size-m, 18px); }
  .social-links--circle .social-links__icon,
  .social-links--rounded .social-links__icon,
  .social-links--square .social-links__icon { width: calc(var(--sl-size-m, 18px) * 2.1); height: calc(var(--sl-size-m, 18px) * 2.1); }
}
</style>
