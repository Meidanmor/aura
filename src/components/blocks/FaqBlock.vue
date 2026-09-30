<template>
  <div v-if="items.length" ref="rootRef" class="faq-block" :class="[`faq-block--${d.style || 'lines'}`, `faq-block--${d.icon_style || 'chevron'}`]" :style="cssVars">
    <details
        v-for="(item, idx) in items"
        :key="idx"
        class="faq-block__item"
        :open="idx === 0 && !!d.first_open"
        @toggle="onToggle($event, idx)"
    >
      <summary class="faq-block__question">
        <span>{{ item.question }}</span>
        <span class="faq-block__icon" aria-hidden="true" />
      </summary>
      <div class="faq-block__answer" v-html="sanitizeBuilderHtml(item.answer)" />
    </details>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useMeta } from 'quasar'
import { sanitizeBuilderHtml } from 'src/utils/sanitizeHtml.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

const d = computed(() => props.data.data || {})
const items = computed(() => (d.value.items || []).filter((i) => i.question))
const rootRef = ref(null)

// "One open at a time": closing the others when one opens.
function onToggle(event, idx) {
  if (d.value.allow_multiple || !event.target.open || !rootRef.value) return
  rootRef.value.querySelectorAll('details').forEach((el, i) => {
    if (i !== idx && el.open) el.open = false
  })
}

// FAQPage structured data (Google rich results), keyed per block.
const plain = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
useMeta(() => {
  if (!d.value.add_schema || !items.value.length) return {}
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.value.map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: plain(i.answer) },
    })),
  }
  return {
    script: {
      [`faq-${props.blockId}`]: {
        type: 'application/ld+json',
        // Escape "<" so the JSON can never close the <script> tag.
        innerHTML: JSON.stringify(schema).replace(/</g, '\\u003c'),
      },
    },
  }
})

const cssVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--faq-q-size', d.value.question_size, toCssLength)
  const map = { question_color: '--faq-q-color', answer_color: '--faq-a-color', accent_color: '--faq-accent', item_bg: '--faq-bg' }
  for (const [key, cssVar] of Object.entries(map)) {
    const c = resolveGlobalColor(d.value[key])
    if (c) vars[cssVar] = c
  }
  return vars
})
</script>

<style scoped>
.faq-block { display: flex; flex-direction: column; }
.faq-block--lines .faq-block__item { border-bottom: 1px solid var(--faq-accent, rgba(0, 0, 0, 0.15)); }
.faq-block--lines .faq-block__item:first-child { border-top: 1px solid var(--faq-accent, rgba(0, 0, 0, 0.15)); }
.faq-block--boxed { gap: 12px; }
.faq-block--boxed .faq-block__item {
  background: var(--faq-bg, #fff);
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 0 18px;
}

.faq-block__question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 0;
  cursor: pointer;
  list-style: none;
  font-weight: 600;
  font-size: var(--faq-q-size, 1.05em);
  color: var(--faq-q-color, inherit);
}
.faq-block__question::-webkit-details-marker { display: none; }
.faq-block__question:focus-visible { outline: 2px solid var(--faq-accent, currentColor); outline-offset: 4px; border-radius: 4px; }

/* Chevron / plus icon drawn with CSS so no icon import is needed. */
.faq-block__icon {
  position: relative;
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  color: var(--faq-accent, currentColor);
  transition: transform 0.2s ease;
}
.faq-block--chevron .faq-block__icon::before {
  content: '';
  position: absolute;
  inset: 1px 3px 5px 3px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
}
.faq-block--chevron .faq-block__item[open] .faq-block__icon { transform: rotate(180deg); }
.faq-block--plus .faq-block__icon::before,
.faq-block--plus .faq-block__icon::after {
  content: '';
  position: absolute;
  top: 6px;
  left: 0;
  width: 14px;
  height: 2px;
  background: currentColor;
  transition: transform 0.2s ease;
}
.faq-block--plus .faq-block__icon::after { transform: rotate(90deg); }
.faq-block--plus .faq-block__item[open] .faq-block__icon::after { transform: rotate(0deg); }

.faq-block__answer {
  padding: 0 0 18px;
  color: var(--faq-a-color, inherit);
  line-height: 1.6;
}
.faq-block__answer :deep(p) { margin: 0 0 0.75em; }
.faq-block__answer :deep(p:last-child) { margin-bottom: 0; }

@media (max-width: 1023px) { .faq-block__question { font-size: var(--faq-q-size-t, 1.05em); } }
@media (max-width: 767px) { .faq-block__question { font-size: var(--faq-q-size-m, 1em); } }
</style>
