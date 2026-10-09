<template>
  <div class="form-block" :class="layoutClasses" :style="cssVars">
    <div v-if="submitted" class="form-block__success" role="status">
      <q-icon :name="matCheckCircle" size="24px" />
      <span>{{ successMessage }}</span>
    </div>

    <q-form
        v-else
        ref="formRef"
        class="form-block__form"
        greedy
        novalidate
        @submit.prevent="onSubmit"
        @validation-error="onValidationError"
    >
      <div class="form-block__fields">
        <div
            v-for="field in fields"
            :key="field.key"
            class="form-block__field"
            :class="{ 'form-block__field--half': field.width === 'half' }"
        >
          <!-- Single checkbox (e.g. consent) -->
          <q-field
              v-if="field.field_type === 'checkbox'"
              v-model="values[field.key]"
              borderless
              dense
              :rules="field.required ? [(v) => v === true || `Please check “${field.label}”.`] : []"
              :error="!!serverErrors[field.key]"
              :error-message="serverErrors[field.key]"
          >
            <template #control>
              <q-checkbox v-model="values[field.key]" :label="labelFor(field)" />
            </template>
          </q-field>

          <!-- Radio group / checkbox group -->
          <q-field
              v-else-if="field.field_type === 'radio' || field.field_type === 'checkboxes'"
              v-model="values[field.key]"
              borderless
              :label="labelFor(field)"
              stack-label
              :rules="groupRules(field)"
              :error="!!serverErrors[field.key]"
              :error-message="serverErrors[field.key]"
          >
            <template #control>
              <q-option-group
                  v-model="values[field.key]"
                  :options="optionList(field)"
                  :type="field.field_type === 'radio' ? 'radio' : 'checkbox'"
                  inline
              />
            </template>
          </q-field>

          <!-- Dropdown -->
          <q-select
              v-else-if="field.field_type === 'select'"
              v-model="values[field.key]"
              :options="optionValues(field)"
              :label="labelFor(field)"
              v-bind="inputStyleProps"
              :rules="field.required ? [(v) => !!v || `“${field.label}” is required.`] : []"
              :error="!!serverErrors[field.key]"
              :error-message="serverErrors[field.key]"
              lazy-rules
          />

          <!-- Text-like inputs -->
          <q-input
              v-else
              v-model="values[field.key]"
              :type="inputType(field)"
              :label="labelFor(field)"
              :placeholder="field.placeholder || undefined"
              :autogrow="field.field_type === 'textarea'"
              :autocomplete="autocomplete(field)"
              v-bind="inputStyleProps"
              :rules="textRules(field)"
              :error="!!serverErrors[field.key]"
              :error-message="serverErrors[field.key]"
              lazy-rules
              @update:model-value="serverErrors[field.key] = ''"
          />
        </div>
      </div>

      <!-- Honeypot: hidden from people, filled in by naive bots. -->
      <div class="hp-field" aria-hidden="true">
        <label>{{ t('Leave this empty') }} <input v-model="honeypotField" type="text" tabindex="-1" autocomplete="off" /></label>
      </div>

      <div class="form-block__actions">
        <q-btn
            type="submit"
            :label="d.submit_text || t('Submit')"
            :loading="submitting"
            :outline="buttonStyle === 'outline'"
            :unelevated="buttonStyle !== 'outline'"
            :color="buttonStyle === 'secondary' ? 'secondary' : 'primary'"
            class="form-block__submit"
            :style="submitStyle"
            no-caps
        />
      </div>

      <p v-if="formError" class="form-block__error" role="alert">{{ formError }}</p>
    </q-form>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { matCheckCircle } from '@quasar/extras/material-icons'
import { useHoneypot } from 'src/composables/useHoneypot.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { asResponsive, setResponsiveVar, toCssLength, alignToFlex } from 'src/composables/useSectionStyle.js'
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
  page: { type: String, default: 'home' },
})

const d = computed(() => props.data.data || {})

/**
 * The fields this form shows. Newsletter/contact forms have a fixed
 * shape that MUST match form_field_definitions() in the plugin
 * (trait-sb-forms.php); custom forms use the fields built in the admin.
 */
const fields = computed(() => {
  switch (d.value.form_type) {
    case 'contact':
      return [
        { key: 'name', label: t('Name'), field_type: 'text', required: true, width: 'half' },
        { key: 'email', label: t('Email'), field_type: 'email', required: true, width: 'half' },
        { key: 'phone', label: t('Phone'), field_type: 'tel', required: false, width: 'full' },
        { key: 'message', label: t('Message'), field_type: 'textarea', required: true, width: 'full' },
      ]
    case 'custom':
      return (d.value.fields || []).filter((f) => f.key && f.label)
    default: {
      const list = []
      if (d.value.collect_name) list.push({ key: 'name', label: t('Name'), field_type: 'text', required: false, width: 'full' })
      list.push({ key: 'email', label: t('Email'), field_type: 'email', required: true, width: 'full', placeholder: 'you@example.com' })
      return list
    }
  }
})

const values = reactive({})
const serverErrors = reactive({})

// (Re)initialize values whenever the field list changes (e.g. live preview edits).
watch(fields, (list) => {
  for (const f of list) {
    if (f.key in values) continue
    values[f.key] = f.field_type === 'checkbox' ? false : (f.field_type === 'checkboxes' ? [] : '')
  }
}, { immediate: true })

const { honeypotField, isLikelyBot } = useHoneypot()
const formRef = ref(null)
const submitting = ref(false)
const submitted = ref(false)
const formError = ref('')
const successMessage = ref('')

const buttonStyle = computed(() => d.value.button_style || 'primary')

// Fill set explicitly: the theme's global `body .q-btn { background: … }`
// rule would otherwise override Quasar's bg-primary/bg-secondary.
const submitStyle = computed(() => {
  const bg = resolveGlobalColor(d.value.button_bg_color)
  const txt = resolveGlobalColor(d.value.button_text_color)
  const style = {}
  if (buttonStyle.value === 'outline') {
    if (bg) style['border-color'] = bg
  } else {
    style.background = bg || `var(--q-${buttonStyle.value === 'secondary' ? 'secondary' : 'primary'})`
  }
  if (txt) style.color = `${txt} !important`
  return style
})

const inputStyleProps = computed(() => {
  const style = d.value.field_style || 'outlined'
  return { outlined: style === 'outlined', filled: style === 'filled' }
})

const labelFor = (f) => (f.required ? `${f.label} *` : f.label)

const optionValues = (f) => String(f.options || '').split('\n').map((o) => o.trim()).filter(Boolean)
const optionList = (f) => optionValues(f).map((o) => ({ label: o, value: o }))

const INPUT_TYPES = { email: 'email', tel: 'tel', number: 'number', url: 'url', date: 'date', textarea: 'textarea' }
const inputType = (f) => INPUT_TYPES[f.field_type] || 'text'

const autocomplete = (f) => {
  if (f.field_type === 'email') return 'email'
  if (f.field_type === 'tel') return 'tel'
  if (f.key === 'name') return 'name'
  return undefined
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function textRules(f) {
  const rules = []
  if (f.required) rules.push((v) => (v !== '' && v != null) || `“${f.label}” is required.`)
  if (f.field_type === 'email') rules.push((v) => !v || EMAIL_RE.test(v) || t('Please enter a valid email address.'))
  if (f.field_type === 'url') rules.push((v) => !v || /^https?:\/\/\S+$/i.test(v) || t('Please enter a full URL (https://…).'))
  return rules
}

function groupRules(f) {
  if (!f.required) return []
  return f.field_type === 'radio'
      ? [(v) => !!v || t('Please choose an option for “{name}”.', { name: f.label })]
      : [(v) => (Array.isArray(v) && v.length > 0) || t('Please choose at least one option for “{name}”.', { name: f.label })]
}

function onValidationError() {
  requestAnimationFrame(() => {
    const el = document.activeElement
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

async function onSubmit() {
  formError.value = ''
  Object.keys(serverErrors).forEach((k) => { serverErrors[k] = '' })

  if (isLikelyBot()) {
    // Quietly pretend it worked.
    successMessage.value = d.value.success_message || t('Thanks!')
    submitted.value = true
    return
  }

  submitting.value = true
  try {
    const payload = {}
    for (const f of fields.value) payload[f.key] = values[f.key]

    const res = await fetch('/wp-json/qwoo/v1/forms/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: props.page, block_id: props.blockId, values: payload, hp: honeypotField.value }),
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      const fieldErrors = json?.data?.fields || {}
      Object.assign(serverErrors, fieldErrors)
      formError.value = t(json?.message || 'Something went wrong. Please try again.')
      return
    }

    successMessage.value = d.value.success_message || t(json.message || 'Thanks!')
    submitted.value = true
  } catch (err) {
    console.error('[FormBlock] submit failed', err)
    formError.value = t('Could not send the form. Please check your connection and try again.')
  } finally {
    submitting.value = false
  }
}

const layoutClasses = computed(() => {
  const layout = asResponsive(d.value.layout || 'stacked')
  const align = asResponsive(d.value.button_align || 'left')
  return {
    'fb-inline-d': layout.desktop === 'inline',
    'fb-inline-t': layout.tablet === 'inline',
    'fb-inline-m': layout.mobile === 'inline',
    'fb-btn-full-d': align.desktop === 'stretch',
    'fb-btn-full-t': align.tablet === 'stretch',
    'fb-btn-full-m': align.mobile === 'stretch',
  }
})

const cssVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--fb-maxw', d.value.max_width, toCssLength)
  setResponsiveVar(vars, '--fb-btn-align', d.value.button_align, alignToFlex)
  // Quasar paints focused fields, checked radios/checkboxes and the default
  // submit button with --q-primary. Overriding it inside this form only lets
  // the admin pick a readable accent even when the site's primary color is a
  // background tone (e.g. #fafafa).
  // Forms saved before this option existed fall back to Secondary.
  const accent = resolveGlobalColor('accent_color' in d.value ? d.value.accent_color : 'global:secondary')
  if (accent) vars['--q-primary'] = accent
  return vars
})
</script>

<style scoped>
.form-block { width: 100%; max-width: var(--fb-maxw, none); }
.form-block__fields { display: flex; flex-wrap: wrap; gap: 4px 16px; }
.form-block__field { flex: 1 1 100%; min-width: 0; }
.form-block__actions { display: flex; justify-content: var(--fb-btn-align, flex-start); margin-top: 4px; }
.form-block__error { color: var(--q-negative); margin: 12px 0 0; }
.form-block__success {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border-radius: 8px;
  background: rgba(33, 186, 69, 0.1);
  color: var(--q-positive);
}

@media (min-width: 768px) {
  .form-block__field--half { flex: 1 1 calc(50% - 8px); }
}

/* Inline layout: fields and button on one row. */
@media (min-width: 1024px) {
  .form-block { max-width: var(--fb-maxw, none); }
  .fb-inline-d .form-block__form { display: flex; align-items: flex-start; gap: 12px; }
  .fb-inline-d .form-block__fields { flex: 1 1 auto; flex-wrap: nowrap; }
  .fb-inline-d .form-block__actions { margin-top: 0; }
  .fb-inline-d .form-block__submit { min-height: 56px; }
  .fb-btn-full-d .form-block__submit { width: 100%; }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .form-block { max-width: var(--fb-maxw-t, none); }
  .form-block__actions { justify-content: var(--fb-btn-align-t, flex-start); }
  .fb-inline-t .form-block__form { display: flex; align-items: flex-start; gap: 12px; }
  .fb-inline-t .form-block__fields { flex: 1 1 auto; flex-wrap: nowrap; }
  .fb-inline-t .form-block__actions { margin-top: 0; }
  .fb-inline-t .form-block__submit { min-height: 56px; }
  .fb-btn-full-t .form-block__submit { width: 100%; }
}
@media (max-width: 767px) {
  .form-block { max-width: var(--fb-maxw-m, none); }
  .form-block__actions { justify-content: var(--fb-btn-align-m, flex-start); }
  .fb-inline-m .form-block__form { display: flex; align-items: flex-start; gap: 12px; }
  .fb-inline-m .form-block__fields { flex: 1 1 auto; flex-wrap: nowrap; }
  .fb-inline-m .form-block__actions { margin-top: 0; }
  .fb-inline-m .form-block__submit { min-height: 56px; }
  .fb-btn-full-m .form-block__submit { width: 100%; }
}
</style>
