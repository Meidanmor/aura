<template>
  <div
       v-if="blockData.items?.length"
       class="container advantages-section"
       :class="{ 'advantages-section--no-divider': blockData.mobile_divider === false, 'advantages-section--cols': hasCols }"
       :style="cssVars"
  >
      <div class="justify-center gap" :class="hasCols ? 'advantages-grid' : 'row'">

        <div
            v-for="(item, index) in blockData.items"
            :key="index"
            data-sb-part="Cards"
            class="advantage-card"
            :class="hasCols ? '' : 'col-12 col-sm-6 col-md-4'">
            <img
                v-if="item.icon === 'custom' && customIconUrl(item)"
                :src="customIconUrl(item)"
                :alt="item.title || ''"
                class="advantage-card__icon advantage-card__icon--custom"
                data-sb-part="Icon"
                loading="lazy"
            />
            <q-icon
                v-else
                :name="iconMap[item.icon] || iconMap.shipping"
                size="40px"
                class="advantage-card__icon"
                data-sb-part="Icon"
            />
            <span v-if="item.title" class="advantage-card__title" v-bind="titleText">{{ item.title }}</span>
            <p v-if="item.text" class="advantage-card__text" v-bind="descText">{{ item.text }}</p>
          </div>
        </div>
      </div>
</template>

<script setup>
import { computed } from 'vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { alignToFlex, alignToText, asResponsive, setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'
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

// Card titles and descriptions (Style tab); their own color wins over Text Color.
const titleText = computed(() => textStyle(blockData.value, tsKeys('title')))
const descText = computed(() => textStyle(blockData.value, tsKeys('desc')))

// Cards Per Row: a grid. Left empty on every screen size, the block keeps its own rows.
const hasCols = computed(() => Object.values(asResponsive(blockData.value.cols)).some((v) => Number(v) > 0))

// A Padding value: all four sides, per screen size.
const sidesVar = (value) => {
  const out = {}
  for (const [device, sides] of Object.entries(asResponsive(value))) {
    const set = sides && typeof sides === 'object' && ['top', 'right', 'bottom', 'left'].some((s) => sides[s] !== '' && sides[s] != null)
    out[device] = set ? ['top', 'right', 'bottom', 'left'].map((s) => toCssLength(sides[s]) || '0').join(' ') : ''
  }
  return out
}

const cssVars = computed(() => {
  const d = blockData.value
  const vars = {
    '--advantage-icon-color': resolveGlobalColor(d.icon_color) || 'var(--q-secondary)',
    '--advantage-text-color': resolveGlobalColor(d.text_color) || 'var(--q-secondary)'
  }
  const plain = { '--adv-card-bg': resolveGlobalColor(d.card_bg), '--adv-card-radius': toCssLength(d.card_radius), '--adv-card-border': toCssLength(d.card_border_width) && `${toCssLength(d.card_border_width)} solid ${resolveGlobalColor(d.card_border_color) || 'currentColor'}`, '--adv-icon-hover': resolveGlobalColor(d.icon_hover), '--adv-icon-bg': resolveGlobalColor(d.icon_bg), '--adv-icon-padding': toCssLength(d.icon_padding), '--adv-icon-radius': toCssLength(d.icon_radius), '--adv-line': resolveGlobalColor(d.line_color) }
  for (const [name, v] of Object.entries(plain)) if (v) vars[name] = v
  if (hasCols.value) setResponsiveVar(vars, '--adv-cols', d.cols, (v) => (Number(v) > 0 ? Number(v) : null))
  setResponsiveVar(vars, '--adv-gap', d.cards_gap, toCssLength)
  setResponsiveVar(vars, '--adv-align', d.card_align, (v) => (v && v !== 'default' ? alignToText(v) : null))
  setResponsiveVar(vars, '--adv-items', d.card_align, (v) => (v && v !== 'default' ? alignToFlex(v) : null))
  setResponsiveVar(vars, '--adv-card-padding', sidesVar(d.card_padding))
  setResponsiveVar(vars, '--adv-icon-size', d.icon_size, toCssLength)
  setResponsiveVar(vars, '--adv-icon-gap', d.icon_gap, toCssLength)
  setResponsiveVar(vars, '--adv-title-gap', d.title_gap, toCssLength)
  return vars
})
</script>

<style scoped>
.advantage-card {
  display: flex;
  flex-direction: column;
  background: var(--adv-card-bg, transparent);
  border-radius: var(--adv-card-radius, 0);
  border: var(--adv-card-border, 0 none);
  padding: var(--adv-card-padding, 0);
}

.advantage-card__icon {
  box-sizing: content-box;
  font-size: var(--adv-icon-size, 40px) !important;
  margin-bottom: var(--adv-icon-gap, 22px);
  color: var(--advantage-icon-color);
  background: var(--adv-icon-bg, transparent);
  padding: var(--adv-icon-padding, 0);
  border-radius: var(--adv-icon-radius, 0);
  transition: color .15s;
}
.advantage-card__icon:hover {
  color: var(--adv-icon-hover, var(--advantage-icon-color));
}

.advantage-card__icon--custom {
  width: var(--adv-icon-size, 40px);
  height: var(--adv-icon-size, 40px);
  object-fit: contain;
}

.advantage-card__title {
  text-transform: uppercase;
  margin: 0 0 var(--adv-title-gap, 18px);
  color: var(--advantage-text-color);
}
.advantage-card__title:last-child {
  margin-bottom: 0;
}

.advantages-grid {
  display: grid;
  grid-template-columns: repeat(var(--adv-cols, 3), minmax(0, 1fr));
  gap: var(--adv-gap, 24px);
}

.advantage-card__text {
  margin: 0;
  color: var(--advantage-text-color);
}
@media(max-width: 767px) {
  .advantage-card {
    margin-bottom: 20px;
    border-bottom: 1px solid var(--adv-line, var(--advantage-text-color));
    width: 100%;
    text-align: var(--adv-align-m, var(--adv-align-t, var(--adv-align, start)));
    align-items: var(--adv-items-m, var(--adv-items-t, var(--adv-items, stretch)));
  }
  .advantage-card__icon {
    font-size: var(--adv-icon-size-m, var(--adv-icon-size-t, var(--adv-icon-size, 40px))) !important;
    margin-bottom: var(--adv-icon-gap-m, var(--adv-icon-gap-t, var(--adv-icon-gap, 22px)));
  }
  .advantage-card__icon--custom {
    width: var(--adv-icon-size-m, var(--adv-icon-size-t, var(--adv-icon-size, 40px)));
    height: var(--adv-icon-size-m, var(--adv-icon-size-t, var(--adv-icon-size, 40px)));
  }
  .advantage-card__title {
    margin-bottom: var(--adv-title-gap-m, var(--adv-title-gap-t, var(--adv-title-gap, 18px)));
  }
  .advantage-card {
    padding: var(--adv-card-padding-m, var(--adv-card-padding-t, var(--adv-card-padding, 0)));
  }
  .advantages-grid {
    grid-template-columns: repeat(var(--adv-cols-m, var(--adv-cols-t, var(--adv-cols, 1))), minmax(0, 1fr));
    gap: var(--adv-gap-m, var(--adv-gap-t, var(--adv-gap, 24px)));
  }
  .advantages-grid .advantage-card { margin-bottom: 0; }
  .advantages-section--no-divider .advantage-card { border-bottom: 0; }
}
@media(min-width: 768px) {
  .advantage-card {
    justify-content: center;
    align-items: var(--adv-items, center);
    text-align: var(--adv-align, center);
    width: calc(100% / 3 - 40px / 3);
  }
  .advantages-grid .advantage-card { width: auto; }
}
@media(min-width: 768px) and (max-width: 1023px) {
  .advantage-card {
    align-items: var(--adv-items-t, var(--adv-items, center));
    text-align: var(--adv-align-t, var(--adv-align, center));
    padding: var(--adv-card-padding-t, var(--adv-card-padding, 0));
  }
  .advantage-card__icon {
    font-size: var(--adv-icon-size-t, var(--adv-icon-size, 40px)) !important;
    margin-bottom: var(--adv-icon-gap-t, var(--adv-icon-gap, 22px));
  }
  .advantage-card__icon--custom {
    width: var(--adv-icon-size-t, var(--adv-icon-size, 40px));
    height: var(--adv-icon-size-t, var(--adv-icon-size, 40px));
  }
  .advantage-card__title {
    margin-bottom: var(--adv-title-gap-t, var(--adv-title-gap, 18px));
  }
  .advantages-grid {
    grid-template-columns: repeat(var(--adv-cols-t, var(--adv-cols, 2)), minmax(0, 1fr));
    gap: var(--adv-gap-t, var(--adv-gap, 24px));
  }
}
</style>