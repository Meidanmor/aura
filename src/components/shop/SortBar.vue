<!-- src/components/shop/SortBar.vue -->
<template>
  <div class="sort-bar" :class="barClasses" :style="barStyle">
    <!-- Show As: Buttons. One button per order, the chosen one pressed. -->
    <div v-if="asButtons" class="sort-main sort-buttons" role="group" :aria-label="labelText">
      <span v-if="showLabel" class="sort-buttons__label" v-bind="labelBind">{{ labelText }}</span>
      <button
          v-for="o in options"
          :key="o.value"
          type="button"
          class="sort-btn"
          :class="[btnBind.class, { 'is-active': o.value === sortBy }]"
          :style="btnBind.style"
          :aria-pressed="o.value === sortBy ? 'true' : 'false'"
          @click="$emit('update:sortBy', o.value)"
      >{{ o.label }}</button>
    </div>

    <!-- Show As: Dropdown list (the default). -->
    <q-select
        v-else
        class="sort-main sort-field"
        :class="fieldBinds.class"
        :style="fieldBinds.style"
        :filled="look === 'filled'"
        :outlined="look === 'outlined'"
        :borderless="look === 'plain'"
        :model-value="sortBy"
        @update:model-value="$emit('update:sortBy', $event)"
        :label="showLabel ? labelText : undefined"
        :aria-label="labelText"
        emit-value
        map-options
        :options="options"
        :dropdown-icon="arrowIcon || matArrowDropDown"
        :hide-dropdown-icon="!arrowIcon"
        :loading-icon="matAutorenew"
        :clear-icon="matClose"
        :popup-content-class="menuClass"
        :popup-content-style="menuStyle"
        color="secondary"
    />

    <q-btn
        class="filters-toggle"
        :class="filtersClasses"
        :style="filtersStyle"
        :icon="matFilterList"
        :label="filterButtonLabel"
        :aria-label="t('Filter products button')"
        color="secondary"
        @click="$emit('toggle-filters')"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { matArrowDropDown, matAutorenew, matClose, matFilterList, matExpandMore, matUnfoldMore } from '@quasar/extras/material-icons'
import { useI18n } from 'src/i18n/index.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { textStyle, textVars, tsKeys, mergeBinds } from 'src/utils/text-style.js'
import { DEVICES, asResponsive, toCssLength, alignToFlex } from 'src/composables/useSectionStyle.js'

/**
 * The shop's order picker: a dropdown (Quasar's select) or a row of buttons,
 * plus the "Filters" button on phones. `data` is the Sort block's settings
 * (every look is empty by default: the dropdown looks as it always did).
 * Responsive values become --so-{name}, -t, -m variables (smaller screens
 * fill in from the bigger one); the CSS picks the one for the screen size.
 */
const props = defineProps({
  sortBy: String,
  sortOptions: Array,
  filterButtonLabel: { type: String, default: '' },
  data: { type: Object, default: () => ({}) },
})
defineEmits(['update:sortBy', 'toggle-filters'])
const { t } = useI18n()

const d = computed(() => props.data || {})
const options = computed(() => (props.sortOptions || []).map((o) => ({ ...o, label: t(o.label) })))
const asButtons = computed(() => d.value.display === 'buttons')
const showLabel = computed(() => d.value.show_label !== false)
const labelText = computed(() => String(d.value.label_text || '').trim() || t('Sort by'))
const LOOKS = new Set(['filled', 'outlined', 'underlined', 'plain'])
const look = computed(() => (LOOKS.has(d.value.field_look) ? d.value.field_look : 'filled'))

// Keys match DROPDOWN_ICONS in class-sb-constants.php.
const ARROWS = { arrow_drop_down: matArrowDropDown, expand_more: matExpandMore, unfold_more: matUnfoldMore }
const arrowIcon = computed(() => (d.value.arrow_icon === 'none' ? '' : ARROWS[d.value.arrow_icon] || matArrowDropDown))

const SUFFIX = { desktop: '', tablet: '-t', mobile: '-m' }
const SHORT = { desktop: 'd', tablet: 't', mobile: 'm' }
const color = (key) => resolveGlobalColor(d.value[key]) || ''
const length = (key) => toCssLength(d.value[key]) || ''

/** --so-{name}(-t/-m) for a responsive value, only for the sizes that have one. */
function responsive(style, name, value, transform = toCssLength) {
  const r = asResponsive(value)
  for (const device of DEVICES) {
    const v = transform(r[device])
    if (v) style[`--so-${name}${SUFFIX[device]}`] = v
  }
}

const JUSTIFY = { default: 'space-between', center: 'center', stretch: 'stretch' }
const barClasses = computed(() => {
  const cls = {}
  const r = asResponsive(d.value.alignment)
  for (const device of DEVICES) if (r[device] === 'stretch') cls[`so-stretch-${SHORT[device]}`] = true
  return cls
})
const barStyle = computed(() => {
  const style = {}
  responsive(style, 'jc', d.value.alignment, (v) => JUSTIFY[v] || alignToFlex(v))
  responsive(style, 'w', d.value.field_width)
  responsive(style, 'h', d.value.field_height)
  responsive(style, 'px', d.value.field_padding_x)
  responsive(style, 'gap', d.value.btn_gap)
  const pad = asResponsive(d.value.btn_padding)
  const last = {}
  for (const device of DEVICES) {
    const box = pad[device] && typeof pad[device] === 'object' ? pad[device] : {}
    for (const side of ['top', 'right', 'bottom', 'left']) {
      // A side left empty on a smaller screen keeps the bigger screen's.
      const v = toCssLength(box[side]) || last[side]
      if (!v) continue
      last[side] = v
      style[`--so-bp-${side}${SUFFIX[device]}`] = v
    }
  }
  const set = (name, v) => { if (v) style[`--so-${name}`] = v }
  set('bg', color('field_bg'))
  set('bc', color('field_border_color'))
  set('bw', length('field_border_width'))
  set('radius', length('field_radius'))
  set('arrow-size', length('arrow_size'))
  set('arrow-color', color('arrow_color'))
  set('bbg', color('btn_bg'))
  set('btext', color('btn_text'))
  set('bb', color('btn_border'))
  set('bbw', length('btn_border_width'))
  set('br', length('btn_radius'))
  set('abg', color('btn_active_bg'))
  set('atext', color('btn_active_text'))
  set('ab', color('btn_active_border'))
  return style
})

// Texts: the label and the chosen option inside Quasar's field (variables), the buttons' own.
const fieldBinds = computed(() => mergeBinds(
  textVars(d.value, tsKeys('label'), 'text', 'sl'),
  textVars(d.value, tsKeys('value'), 'text', 'sv'),
  { class: { 'so-has-bg': !!color('field_bg'), 'so-has-bc': !!color('field_border_color'), 'so-has-bw': !!length('field_border_width'), 'so-has-radius': !!length('field_radius'), 'so-has-arrow': !!(length('arrow_size') || color('arrow_color')) } },
))
const labelBind = computed(() => textStyle(d.value, tsKeys('label')))
const btnBind = computed(() => textStyle(d.value, tsKeys('btn'), 'buttons'))

// The open list is drawn at the end of the page (outside the block): its looks go on it directly.
const menuClass = computed(() => ['qwoo-sort-menu', color('list_hover_bg') && 'so-hover', color('list_active_text') && 'so-active'].filter(Boolean).join(' '))
const menuStyle = computed(() => {
  const style = {}
  if (color('list_bg')) style.background = color('list_bg')
  if (color('list_text')) style.color = color('list_text')
  if (length('list_radius')) style.borderRadius = length('list_radius')
  if (color('list_hover_bg')) style['--so-list-hover'] = color('list_hover_bg')
  if (color('list_active_text')) style['--so-list-active'] = color('list_active_text')
  const font = textVars(d.value, tsKeys('value'), 'text', 'sv').style['--ts-sv-font']
  if (font) style.fontFamily = font
  return style
})

const filtersClasses = computed(() => ({ 'so-fbg': !!color('filters_bg'), 'so-ftext': !!color('filters_text') }))
const filtersStyle = computed(() => ({ '--so-fbg': color('filters_bg') || undefined, '--so-ftext': color('filters_text') || undefined }))
</script>

<style scoped>
.sort-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  justify-content: var(--so-jc-now, space-between);
  --so-jc-now: var(--so-jc);
  --so-w-now: var(--so-w);
  --so-h-now: var(--so-h);
  --so-px-now: var(--so-px);
  --so-gap-now: var(--so-gap);
  --so-bpt: var(--so-bp-top);
  --so-bpr: var(--so-bp-right);
  --so-bpb: var(--so-bp-bottom);
  --so-bpl: var(--so-bp-left);
}
@media (min-width: 768px) and (max-width: 1023px) {
  .sort-bar {
    --so-jc-now: var(--so-jc-t); --so-w-now: var(--so-w-t); --so-h-now: var(--so-h-t); --so-px-now: var(--so-px-t); --so-gap-now: var(--so-gap-t);
    --so-bpt: var(--so-bp-top-t); --so-bpr: var(--so-bp-right-t); --so-bpb: var(--so-bp-bottom-t); --so-bpl: var(--so-bp-left-t);
  }
}
@media (max-width: 767px) {
  .sort-bar {
    --so-jc-now: var(--so-jc-m); --so-w-now: var(--so-w-m); --so-h-now: var(--so-h-m); --so-px-now: var(--so-px-m); --so-gap-now: var(--so-gap-m);
    --so-bpt: var(--so-bp-top-m); --so-bpr: var(--so-bp-right-m); --so-bpb: var(--so-bp-bottom-m); --so-bpl: var(--so-bp-left-m);
  }
}
/* Full width, per screen size. */
@media (min-width: 1024px) { .so-stretch-d .sort-main { flex: 1 1 auto; width: auto; } }
@media (min-width: 768px) and (max-width: 1023px) { .so-stretch-t .sort-main { flex: 1 1 auto; width: auto; } }
@media (max-width: 767px) { .so-stretch-m .sort-main { flex: 1 1 auto; width: auto; } }

/* The dropdown's box. */
.sort-field { width: var(--so-w-now, auto); min-width: var(--so-w-now, 160px); }
.sort-field :deep(.q-field__control),
.sort-field :deep(.q-field__marginal) { min-height: var(--so-h-now, 56px); height: var(--so-h-now, 56px); }
.sort-field :deep(.q-field__control) { padding-inline: var(--so-px-now, 12px); }
.sort-field.q-field--borderless :deep(.q-field__control) { padding-inline: var(--so-px-now, 0px); }
.so-has-bg :deep(.q-field__control) { background: var(--so-bg); }
.so-has-radius :deep(.q-field__control),
.so-has-radius :deep(.q-field__control::before),
.so-has-radius :deep(.q-field__control::after) { border-radius: var(--so-radius); }
.so-has-bc.q-field--outlined :deep(.q-field__control::before) { border-color: var(--so-bc); }
.so-has-bc:not(.q-field--outlined) :deep(.q-field__control::before) { border-bottom-color: var(--so-bc); }
.so-has-bw.q-field--outlined :deep(.q-field__control::before) { border-width: var(--so-bw); }
.so-has-bw:not(.q-field--outlined) :deep(.q-field__control::before) { border-bottom-width: var(--so-bw); }
.so-has-arrow :deep(.q-select__dropdown-icon) { font-size: var(--so-arrow-size, 24px); color: var(--so-arrow-color, inherit); }

/* Label and chosen option (Style → Label / Chosen Option). */
.ts-sl-font :deep(.q-field__label) { font-family: var(--ts-sl-font); }
.ts-sl-weight :deep(.q-field__label) { font-weight: var(--ts-sl-weight); }
.ts-sl-color :deep(.q-field__label) { color: var(--ts-sl-color); }
.ts-sl-case :deep(.q-field__label) { text-transform: var(--ts-sl-case); }
.ts-sv-font :deep(.q-field__native) { font-family: var(--ts-sv-font); }
.ts-sv-weight :deep(.q-field__native) { font-weight: var(--ts-sv-weight); }
.ts-sv-color :deep(.q-field__native) { color: var(--ts-sv-color); }
.ts-sv-case :deep(.q-field__native) { text-transform: var(--ts-sv-case); }
@media (min-width: 1024px) {
  .ts-sl-sz-d :deep(.q-field__label) { font-size: var(--ts-sl-size); }
  .ts-sl-lh-d :deep(.q-field__label) { line-height: var(--ts-sl-lh); }
  .ts-sl-ls-d :deep(.q-field__label) { letter-spacing: var(--ts-sl-ls); }
  .ts-sv-sz-d :deep(.q-field__native) { font-size: var(--ts-sv-size); }
  .ts-sv-lh-d :deep(.q-field__native) { line-height: var(--ts-sv-lh); }
  .ts-sv-ls-d :deep(.q-field__native) { letter-spacing: var(--ts-sv-ls); }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .ts-sl-sz-t :deep(.q-field__label) { font-size: var(--ts-sl-size-t); }
  .ts-sl-lh-t :deep(.q-field__label) { line-height: var(--ts-sl-lh-t); }
  .ts-sl-ls-t :deep(.q-field__label) { letter-spacing: var(--ts-sl-ls-t); }
  .ts-sv-sz-t :deep(.q-field__native) { font-size: var(--ts-sv-size-t); }
  .ts-sv-lh-t :deep(.q-field__native) { line-height: var(--ts-sv-lh-t); }
  .ts-sv-ls-t :deep(.q-field__native) { letter-spacing: var(--ts-sv-ls-t); }
}
@media (max-width: 767px) {
  .ts-sl-sz-m :deep(.q-field__label) { font-size: var(--ts-sl-size-m); }
  .ts-sl-lh-m :deep(.q-field__label) { line-height: var(--ts-sl-lh-m); }
  .ts-sl-ls-m :deep(.q-field__label) { letter-spacing: var(--ts-sl-ls-m); }
  .ts-sv-sz-m :deep(.q-field__native) { font-size: var(--ts-sv-size-m); }
  .ts-sv-lh-m :deep(.q-field__native) { line-height: var(--ts-sv-lh-m); }
  .ts-sv-ls-m :deep(.q-field__native) { letter-spacing: var(--ts-sv-ls-m); }
}

/* Show As: Buttons. */
.sort-buttons { display: flex; flex-wrap: wrap; align-items: center; gap: var(--so-gap-now, 8px); }
.sort-btn {
  font: inherit;
  cursor: pointer;
  padding: var(--so-bpt, 6px) var(--so-bpr, 14px) var(--so-bpb, 6px) var(--so-bpl, 14px);
  border: var(--so-bbw, 1px) solid var(--so-bb, currentColor);
  border-radius: var(--so-br, 999px);
  background: var(--so-bbg, transparent);
  color: var(--so-btext, inherit);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.sort-btn.is-active {
  background: var(--so-abg, var(--q-secondary));
  color: var(--so-atext, #fff);
  border-color: var(--so-ab, var(--so-abg, var(--q-secondary)));
}
.sort-btn:focus-visible { outline: 2px solid var(--so-abg, var(--q-secondary)); outline-offset: 2px; }

/* By screen width only: Quasar's .mobile-only also hides on desktop browsers (the Store builder preview). */
.filters-toggle { display: none; }
@media (max-width: 767px) { .filters-toggle { display: inline-flex; } }
/* Quasar's bg-secondary / text-white are !important. */
.filters-toggle.so-fbg { background: var(--so-fbg) !important; }
.filters-toggle.so-ftext { color: var(--so-ftext) !important; }
</style>

<style>
/* The open list (drawn at the end of the page, so not scoped). Quasar marks the chosen option with
   text-secondary (!important). */
.qwoo-sort-menu.so-hover .q-item:hover { background: var(--so-list-hover); }
.qwoo-sort-menu.so-hover .q-item .q-focus-helper { display: none; }
.qwoo-sort-menu.so-active .q-item.q-item--active { color: var(--so-list-active) !important; }
</style>
