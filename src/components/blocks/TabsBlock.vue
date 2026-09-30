<template>
  <div
      v-if="items.length"
      class="tabs-block"
      :class="[`tabs-block--${d.style || 'underline'}`, { 'tabs-block--accordion-m': d.mobile_display !== 'tabs' }, alignClasses]"
      :style="cssVars"
  >
    <div class="tabs-block__list" role="tablist" @keydown="onKeydown">
      <button
          v-for="(item, idx) in items"
          :id="`${uid}-tab-${idx}`"
          :key="idx"
          ref="tabRefs"
          type="button"
          role="tab"
          class="tabs-block__tab"
          :class="{ 'is-active': idx === active }"
          :aria-selected="idx === active ? 'true' : 'false'"
          :aria-controls="`${uid}-panel-${idx}`"
          :tabindex="idx === active ? 0 : -1"
          @click="select(idx)"
      >
        {{ item.title }}
      </button>
    </div>

    <div
        v-for="(item, idx) in items"
        :key="idx"
        class="tabs-block__item"
        :class="{ 'is-active': idx === active, 'is-open': openItems.has(idx) }"
    >
      <!-- Accordion header: only visible on mobile in accordion mode. -->
      <button
          type="button"
          class="tabs-block__acc-header"
          :aria-expanded="openItems.has(idx) ? 'true' : 'false'"
          :aria-controls="`${uid}-panel-${idx}`"
          @click="toggle(idx)"
      >
        <span>{{ item.title }}</span>
        <span class="tabs-block__chevron" aria-hidden="true" />
      </button>
      <div
          :id="`${uid}-panel-${idx}`"
          class="tabs-block__panel"
          role="tabpanel"
          :aria-labelledby="`${uid}-tab-${idx}`"
          tabindex="0"
          v-html="sanitizeBuilderHtml(item.content)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { sanitizeBuilderHtml } from 'src/utils/sanitizeHtml.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { asResponsive } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

const d = computed(() => props.data.data || {})
const items = computed(() => (d.value.items || []).filter((i) => i.title))
const uid = computed(() => `tabs-${props.blockId}`)

const active = ref(0)
const openItems = reactive(new Set([0]))
const tabRefs = ref([])

watch(() => items.value.length, (n) => { if (active.value >= n) active.value = 0 })

function select(idx) {
  active.value = idx
}

function toggle(idx) {
  if (openItems.has(idx)) openItems.delete(idx)
  else openItems.add(idx)
  active.value = idx
}

// Arrow keys / Home / End move between tabs (WAI-ARIA tabs pattern).
function onKeydown(e) {
  const n = items.value.length
  const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity }
  if (!(e.key in moves)) return
  e.preventDefault()
  const step = moves[e.key]
  const next = step === -Infinity ? 0 : step === Infinity ? n - 1 : (active.value + step + n) % n
  select(next)
  tabRefs.value[next]?.focus()
}

const ALIGN = { left: 'flex-start', center: 'center', right: 'flex-end', stretch: 'stretch' }
const alignClasses = computed(() => {
  const a = asResponsive(d.value.alignment || 'left')
  return { 'tb-stretch-d': a.desktop === 'stretch', 'tb-stretch-t': a.tablet === 'stretch', 'tb-stretch-m': a.mobile === 'stretch' }
})

const cssVars = computed(() => {
  const vars = {}
  const a = asResponsive(d.value.alignment || 'left')
  vars['--tb-justify'] = ALIGN[a.desktop] || 'flex-start'
  vars['--tb-justify-t'] = ALIGN[a.tablet] || 'flex-start'
  vars['--tb-justify-m'] = ALIGN[a.mobile] || 'flex-start'
  const activeColor = resolveGlobalColor(d.value.active_color)
  if (activeColor) vars['--tb-active'] = activeColor
  const text = resolveGlobalColor(d.value.text_color)
  if (text) vars['--tb-text'] = text
  const content = resolveGlobalColor(d.value.content_color)
  if (content) vars['--tb-content'] = content
  return vars
})
</script>

<style scoped>
.tabs-block__list {
  display: flex;
  gap: 4px;
  justify-content: var(--tb-justify, flex-start);
  overflow-x: auto;
  scrollbar-width: none;
}
.tabs-block__list::-webkit-scrollbar { display: none; }
.tabs-block__tab {
  flex: 0 0 auto;
  border: 0;
  background: none;
  padding: 12px 18px;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  color: var(--tb-text, inherit);
  opacity: 0.7;
  white-space: nowrap;
  transition: opacity 0.2s, color 0.2s, background 0.2s;
}
.tabs-block__tab:hover,
.tabs-block__tab.is-active { opacity: 1; }
.tabs-block__tab:focus-visible { outline: 2px solid var(--tb-active, currentColor); outline-offset: -2px; }

/* Styles */
.tabs-block--underline .tabs-block__list { border-bottom: 1px solid rgba(0, 0, 0, 0.12); }
.tabs-block--underline .tabs-block__tab { border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tabs-block--underline .tabs-block__tab.is-active { border-bottom-color: var(--tb-active, currentColor); color: var(--tb-active, inherit); }
.tabs-block--pills .tabs-block__tab { border-radius: 999px; }
.tabs-block--pills .tabs-block__tab.is-active { background: var(--tb-active, #333); color: #fff; }
.tabs-block--boxed .tabs-block__list { gap: 0; }
.tabs-block--boxed .tabs-block__tab { border: 1px solid rgba(0, 0, 0, 0.12); margin-right: -1px; }
.tabs-block--boxed .tabs-block__tab.is-active { background: var(--tb-active, #333); border-color: var(--tb-active, #333); color: #fff; }

.tabs-block__panel {
  display: none;
  padding: 20px 0;
  color: var(--tb-content, inherit);
  line-height: 1.6;
}
.tabs-block__panel:focus-visible { outline: 2px solid var(--tb-active, currentColor); outline-offset: 2px; }
.tabs-block__panel :deep(p) { margin: 0 0 0.75em; }
.tabs-block__panel :deep(p:last-child) { margin-bottom: 0; }
.tabs-block__item.is-active .tabs-block__panel { display: block; }
.tabs-block__acc-header { display: none; }

@media (min-width: 1024px) {
  .tb-stretch-d .tabs-block__tab { flex: 1 1 0; }
}
@media (max-width: 1023px) {
  .tabs-block__list { justify-content: var(--tb-justify-t, flex-start); }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .tb-stretch-t .tabs-block__tab { flex: 1 1 0; }
}
@media (max-width: 767px) {
  .tabs-block__list { justify-content: var(--tb-justify-m, flex-start); }
  .tb-stretch-m .tabs-block__tab { flex: 1 1 0; }

  /* Accordion mode on mobile */
  .tabs-block--accordion-m .tabs-block__list { display: none; }
  .tabs-block--accordion-m .tabs-block__acc-header {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 0;
    border: 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    background: none;
    font: inherit;
    font-weight: 600;
    text-align: left;
    color: var(--tb-text, inherit);
    cursor: pointer;
  }
  .tabs-block--accordion-m .tabs-block__item .tabs-block__panel { display: none; }
  .tabs-block--accordion-m .tabs-block__item.is-open .tabs-block__panel { display: block; padding: 12px 0 16px; }
  .tabs-block__chevron {
    width: 10px;
    height: 10px;
    border-right: 2px solid var(--tb-active, currentColor);
    border-bottom: 2px solid var(--tb-active, currentColor);
    transform: rotate(45deg);
    transition: transform 0.2s;
  }
  .tabs-block__item.is-open .tabs-block__chevron { transform: rotate(-135deg); }
}
</style>
