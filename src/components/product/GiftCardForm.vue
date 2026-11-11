<template>
  <div ref="root" class="gc-form">
    <div class="gc-step">
      <div class="gc-label">{{ t('Amount') }}</div>
      <div class="gc-chips" role="radiogroup" :aria-label="t('Amount')">
        <button
            v-for="a in g.amounts"
            :key="a"
            type="button"
            role="radio"
            class="gc-chip"
            :class="{ 'is-on': !s.custom && s.amount === a }"
            :aria-checked="!s.custom && s.amount === a ? 'true' : 'false'"
            @click="s.custom = false; s.amount = a"
        >{{ money(a) }}</button>
        <button
            v-if="g.custom && g.amounts.length"
            type="button"
            role="radio"
            class="gc-chip"
            :class="{ 'is-on': s.custom }"
            :aria-checked="s.custom ? 'true' : 'false'"
            @click="s.custom = true"
        >{{ t('Other amount') }}</button>
      </div>
      <q-input
          v-if="s.custom"
          :for="fid('amount')"
          v-model="s.customText"
          class="q-mt-sm"
          outlined
          dense
          inputmode="decimal"
          maxlength="9"
          :label="t('Your amount, from {min} to {max}', { min: money(g.min), max: money(g.max) })"
          :error="tried && !amount"
          :error-message="t('Choose an amount from {min} to {max}.', { min: money(g.min), max: money(g.max) })"
      />
    </div>

    <div class="gc-step">
      <div class="gc-label">{{ t('Who is it for?') }}</div>
      <div class="gc-two">
        <q-input :for="fid('to-name')" v-model="s.to_name" outlined dense maxlength="80" :label="t('Their name')" :error="tried && !s.to_name.trim()" :error-message="t('Enter their name.')" />
        <q-input :for="fid('to-email')" v-model="s.to_email" outlined dense type="email" maxlength="190" :label="t('Their email')" :error="tried && !emailOk" :error-message="t('Enter a valid email address.')" />
      </div>
    </div>

    <div class="gc-step">
      <q-input :for="fid('from')" v-model="s.from" outlined dense maxlength="80" :label="t('From')" :hint="t('Your name, as they\'ll see it')" />
    </div>

    <div class="gc-step">
      <q-input :for="fid('message')" v-model="s.message" outlined type="textarea" autogrow :maxlength="g.max_message || 300" :label="t('Your message (optional)')" counter />
    </div>

    <div class="gc-step">
      <div class="gc-label">{{ t('When should we send it?') }}</div>
      <div class="gc-chips" role="radiogroup" :aria-label="t('When should we send it?')">
        <button type="button" role="radio" class="gc-chip" :class="{ 'is-on': s.when === 'now' }" :aria-checked="s.when === 'now' ? 'true' : 'false'" @click="s.when = 'now'">{{ t('Right after payment') }}</button>
        <button type="button" role="radio" class="gc-chip" :class="{ 'is-on': s.when === 'date' }" :aria-checked="s.when === 'date' ? 'true' : 'false'" @click="pickDate">{{ t('On a date') }}</button>
      </div>
      <div v-if="s.when === 'date'" class="gc-two q-mt-sm">
        <q-input
            :for="fid('send-on')"
            v-model="s.send_on"
            outlined
            dense
            type="date"
            :min="minDate"
            :max="maxDate"
            :label="t('Send on')"
            :error="tried && !dateOk"
            :error-message="t('Choose a day from today to a year from now.')"
        />
        <q-select
            :for="fid('send-time')"
            v-model="s.send_time"
            outlined
            dense
            :options="SEND_TIMES"
            :dropdown-icon="matArrowDropDown"
            popup-content-class="gc-time-menu"
            options-selected-class="gc-time-on"
            :label="t('At')"
            :error="tried && timePassed"
            :error-message="t('This time has passed. Choose a later one.')"
        />
      </div>
      <div v-if="s.when === 'date' && otherTimeZone(g)" class="gc-fine">{{ t('Times are in the store\'s time zone ({tz}).', { tz: g.timezone }) }}</div>
    </div>

    <!-- Computers: the design choices fold open here. Phones and tablets: "Design this email" beside Add to cart opens them over the email. -->
    <details class="gc-acc gc-desk-block">
      <summary>
        <span><b>{{ t('Design the email') }}</b><small>{{ designSummary }}</small></span>
        <i aria-hidden="true" />
      </summary>
      <div class="gc-acc__body">
        <div v-if="g.designs.length > 1" class="gc-step">
          <div class="gc-label">{{ t('Design') }}</div>
          <div class="gc-designs">
            <button
                v-for="d in g.designs"
                :key="d.id"
                type="button"
                class="gc-design"
                :class="{ 'is-on': s.design === d.id }"
                :aria-pressed="s.design === d.id ? 'true' : 'false'"
                @click="s.design = d.id"
            >
              <span class="gc-design__band" :style="{ background: s.color }">{{ d.mark }}</span>
              <span>{{ d.name }}</span>
            </button>
          </div>
        </div>
        <div v-if="g.palette.length > 1" class="gc-step">
          <div class="gc-label">{{ t('Colour') }}</div>
          <div class="gc-swatches">
            <button
                v-for="c in g.palette"
                :key="c"
                type="button"
                class="gc-sw"
                :class="{ 'is-on': s.color === c }"
                :style="{ background: c }"
                :aria-label="t('Colour {n}', { n: g.palette.indexOf(c) + 1 })"
                :aria-pressed="s.color === c ? 'true' : 'false'"
                @click="s.color = c"
            />
          </div>
        </div>
        <div v-if="g.images.length || g.own_photo" class="gc-step">
          <div class="gc-label">{{ t('Image') }} <small>{{ t('Optional') }}</small></div>
          <div class="gc-images">
            <button type="button" class="gc-img" :class="{ 'is-on': !s.image }" :aria-pressed="!s.image ? 'true' : 'false'" @click="pickImage(null)">{{ t('No image') }}</button>
            <button
                v-for="(img, i) in g.images"
                :key="img.id"
                type="button"
                class="gc-img"
                :class="{ 'is-on': s.image === `p:${img.id}` }"
                :style="{ backgroundImage: `url('${img.url}')` }"
                :aria-label="t('Image {n}', { n: i + 1 })"
                :aria-pressed="s.image === `p:${img.id}` ? 'true' : 'false'"
                @click="pickImage(img)"
            />
            <label v-if="g.own_photo" class="gc-img gc-img--own" :class="{ 'is-on': s.image.startsWith('u:') }" :style="s.photo || ownUrl ? { backgroundImage: `url('${s.photo || ownUrl}')` } : null">
              <q-spinner v-if="uploading" size="22px" />
              <span v-else-if="!s.photo && !ownUrl">{{ t('Your photo') }}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" :aria-label="t('Upload your photo')" @change="onPhoto">
            </label>
          </div>
          <div v-if="photoError" class="text-negative text-caption q-mt-xs">{{ photoError }}</div>
          <div v-else-if="g.own_photo" class="gc-fine">{{ t('JPG or PNG. Only the recipient sees it.') }}</div>
        </div>
      </div>
    </details>

    <q-btn
        type="button"
        class="gc-see gc-desk-only"
        flat
        no-caps
        :label="t('See the email')"
        @click="previewOpen = true"
    />

    <div class="gc-buyrow">
      <button type="button" class="gc-design-btn gc-phone-only" aria-haspopup="dialog" @click="designOpen = true">
        <b>{{ designTabs.length ? t('Design this email') : t('See the email') }}</b>
        <small v-if="designTabs.length">{{ designSummary }}</small>
      </button>
      <q-btn
          class="gc-buy full-width"
          :class="buttonClass"
          :style="buttonStyle"
          :color="buttonColor"
          unelevated
          no-caps
          :loading="adding"
          :label="amount ? t('Add to cart · {amount}', { amount: money(amount) }) : t('Add to cart')"
          @click="add"
      />
    </div>
    <div v-if="tried && !ready" class="text-negative text-caption q-mt-xs">{{ t('Fill in the fields marked above.') }}</div>
    <p class="gc-fine">{{ fineText }}</p>

    <!-- Phones and tablets: the design choices on top, the email under them, and a floating Add to cart. -->
    <q-dialog v-model="designOpen" maximized transition-show="slide-up" transition-hide="slide-down">
      <div class="gc-sheet" role="dialog" :aria-label="t('Design this email')">
        <div class="gc-sheet__head">
          <b>{{ designTabs.length ? t('Design this email') : t('Gift card email preview') }}</b>
          <q-btn flat round dense :icon="matClose" :aria-label="t('Close')" @click="designOpen = false" />
        </div>
        <div v-if="designTabs.length" class="gc-sheet__top">
          <div v-if="designTabs.length > 1" class="gc-sheet__tabs" role="tablist">
            <button
                v-for="tab in designTabs"
                :key="tab.key"
                type="button"
                role="tab"
                :class="{ 'is-on': designTab === tab.key }"
                :aria-selected="designTab === tab.key ? 'true' : 'false'"
                @click="designTabChosen = tab.key"
            >{{ tab.label }}</button>
          </div>
          <div v-if="designTab === 'design'" class="gc-sheet__row">
            <button
                v-for="d in g.designs"
                :key="d.id"
                type="button"
                class="gc-design"
                :class="{ 'is-on': s.design === d.id }"
                :aria-pressed="s.design === d.id ? 'true' : 'false'"
                @click="s.design = d.id"
            >
              <span class="gc-design__band" :style="{ background: s.color }">{{ d.mark }}</span>
              <span>{{ d.name }}</span>
            </button>
          </div>
          <div v-else-if="designTab === 'colour'" class="gc-sheet__row gc-sheet__row--pad">
            <button
                v-for="c in g.palette"
                :key="c"
                type="button"
                class="gc-sw"
                :class="{ 'is-on': s.color === c }"
                :style="{ background: c }"
                :aria-label="t('Colour {n}', { n: g.palette.indexOf(c) + 1 })"
                :aria-pressed="s.color === c ? 'true' : 'false'"
                @click="s.color = c"
            />
          </div>
          <div v-else class="gc-sheet__row">
            <button type="button" class="gc-img" :class="{ 'is-on': !s.image }" :aria-pressed="!s.image ? 'true' : 'false'" @click="pickImage(null)">{{ t('No image') }}</button>
            <button
                v-for="(img, i) in g.images"
                :key="img.id"
                type="button"
                class="gc-img"
                :class="{ 'is-on': s.image === `p:${img.id}` }"
                :style="{ backgroundImage: `url('${img.url}')` }"
                :aria-label="t('Image {n}', { n: i + 1 })"
                :aria-pressed="s.image === `p:${img.id}` ? 'true' : 'false'"
                @click="pickImage(img)"
            />
            <label v-if="g.own_photo" class="gc-img gc-img--own" :class="{ 'is-on': s.image.startsWith('u:') }" :style="s.photo || ownUrl ? { backgroundImage: `url('${s.photo || ownUrl}')` } : null">
              <q-spinner v-if="uploading" size="22px" />
              <span v-else-if="!s.photo && !ownUrl">{{ t('Your photo') }}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" :aria-label="t('Upload your photo')" @change="onPhoto">
            </label>
          </div>
          <div v-if="photoError && designTab === 'image'" class="text-negative text-caption q-mt-xs">{{ photoError }}</div>
        </div>
        <div class="gc-sheet__preview"><GiftCardPreview :product="product" bare /></div>
        <q-btn
            class="gc-sheet__add"
            :class="buttonClass"
            :style="buttonStyle"
            :color="buttonColor"
            unelevated
            no-caps
            :loading="adding"
            :label="amount ? t('Add to cart · {amount}', { amount: money(amount) }) : t('Add to cart')"
            @click="addFromSheet"
        />
      </div>
    </q-dialog>

    <q-dialog v-model="previewOpen">
      <q-card class="gc-dialog">
        <q-card-section class="row items-center no-wrap">
          <div class="text-subtitle1 col">{{ t('Gift card email preview') }}</div>
          <q-btn flat round dense :icon="matClose" :aria-label="t('Close')" @click="previewOpen = false" />
        </q-card-section>
        <q-card-section class="q-pt-none"><GiftCardPreview :product="product" bare /></q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useQuasar } from 'quasar'
import { matArrowDropDown, matClose } from '@quasar/extras/material-icons'
import { useFieldIds } from 'src/utils/field-id.js'
import { t } from 'src/i18n/index.js'
import cart from 'src/stores/cart'
import { SEND_TIMES, chosenAmount, giftDetails, giftMoney, giftSettings, giftState, inAYearIso, nowTime, otherTimeZone, todayIso, uploadPhoto } from 'src/utils/gift-card.js'
import GiftCardPreview from './GiftCardPreview.vue'

/**
 * A gift card product's page (inside the Add To Cart block): the amount, who
 * it's for, from, a message, the send day, and the email's design, colour
 * and image (the owner's choices, Products → the gift card). The email's
 * preview shows in the Product Gallery's place and behind "See the email".
 */
const props = defineProps({
  product: { type: Object, required: true },
  buttonClass: { type: [String, Array, Object], default: '' },
  buttonStyle: { type: [String, Array, Object], default: '' },
  buttonColor: { type: String, default: undefined },
})
const fid = useFieldIds()
const $q = useQuasar()
const g = computed(() => giftSettings(props.product))
const s = giftState(props.product)
const money = (a) => giftMoney(a, props.product.prices)

const tried = ref(false)
const adding = ref(false)
const previewOpen = ref(false)
// Phones and tablets: "Design this email" (the design choices over the email, a floating Add to cart).
const root = ref(null)
const designOpen = ref(false)
const designTabs = computed(() => [
  g.value.designs.length > 1 && { key: 'design', label: t('Design') },
  g.value.palette.length > 1 && { key: 'colour', label: t('Colour') },
  (g.value.images.length || g.value.own_photo) && { key: 'image', label: t('Image') },
].filter(Boolean))
const designTabChosen = ref('')
const designTab = computed(() => (designTabs.value.some((x) => x.key === designTabChosen.value) ? designTabChosen.value : designTabs.value[0]?.key || ''))
const minDate = todayIso()
const maxDate = inAYearIso()

const amount = computed(() => chosenAmount(s, g.value))
const emailOk = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.to_email.trim()))
const dateOk = computed(() => s.when !== 'date' || (!!s.send_on && s.send_on >= minDate && s.send_on <= maxDate))
// Today at a time that has passed (in the shopper's clock; the store sends right away if it's past there).
const timePassed = computed(() => s.when === 'date' && s.send_on === minDate && !otherTimeZone(g.value) && s.send_time <= nowTime())
const ready = computed(() => !!amount.value && !!s.to_name.trim() && emailOk.value && dateOk.value && !timePassed.value && !uploading.value)

const designSummary = computed(() => {
  const d = g.value.designs.find((x) => x.id === s.design)
  const image = s.image.startsWith('u:') ? t('your photo') : s.image ? t('with an image') : t('no image')
  return [d?.name, image].filter(Boolean).join(', ')
})
const fineText = computed(() => {
  const exp = g.value.expiry ? (g.value.expiry === 1 ? t('Valid for 1 year from the day it\'s sent.') : t('Valid for {n} years from the day it\'s sent.', { n: g.value.expiry })) : t('Never expires.')
  return `${exp} ${t('It can be used over several orders.')}`
})

function pickDate() {
  s.when = 'date'
  if (!s.send_on) s.send_on = minDate
}
function pickImage(img) {
  s.image = img ? `p:${img.id}` : ''
  s.imageUrl = img ? img.url : ''
  s.photo = ''
}

const uploading = ref(false)
const photoError = ref('')
const ownUrl = ref('')
async function onPhoto(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  photoError.value = ''
  uploading.value = true
  try {
    const up = await uploadPhoto(file, props.product.id)
    s.image = up.image
    s.imageUrl = up.url
    s.photo = up.preview
    ownUrl.value = up.preview
  } catch (err) {
    photoError.value = err.message
  } finally {
    uploading.value = false
  }
}

// The floating button in "Design this email": it closes, and adds the card; with something
// missing it goes to the first field that needs filling in.
async function addFromSheet() {
  designOpen.value = false
  if (ready.value) return add()
  tried.value = true
  await nextTick()
  setTimeout(() => {
    const field = root.value?.querySelector('.q-field--error') || root.value
    field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    field?.querySelector?.('input, textarea')?.focus({ preventScroll: true })
  }, 320)
}

async function add() {
  tried.value = true
  if (!ready.value) return
  adding.value = true
  try {
    await cart.addGiftCard(props.product, giftDetails(s, g.value), $q)
    tried.value = false
  } finally {
    adding.value = false
  }
}
</script>

<style scoped>
.gc-form { display: grid; gap: 4px; }
/* purgecss start ignore */
/* Focused fields take the page's text colour, not the store's main colour (often near white in templates). */
.gc-form :deep(.q-field--highlighted .q-field__control),
.gc-form :deep(.q-field--highlighted .q-field__label),
.gc-form :deep(.q-field--highlighted .q-field__marginal) { color: inherit; }
/* purgecss end ignore */
.gc-step { margin-bottom: 14px; }
.gc-label { font-weight: 600; font-size: 14px; margin-bottom: 8px; }
.gc-label small { font-weight: 400; opacity: .65; }
.gc-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.gc-chip { border: 1.5px solid rgba(0, 0, 0, .18); background: transparent; color: inherit; padding: 9px 16px; border-radius: 999px; font: inherit; font-weight: 600; cursor: pointer; font-variant-numeric: tabular-nums; }
.gc-chip.is-on { border-color: currentColor; box-shadow: inset 0 0 0 1px currentColor; }
.gc-two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
@media (max-width: 520px) { .gc-two { grid-template-columns: minmax(0, 1fr); gap: 0; } }
.gc-acc { border: 1.5px solid rgba(0, 0, 0, .14); border-radius: 12px; margin-bottom: 6px; }
.gc-acc summary { list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px; cursor: pointer; }
.gc-acc summary::-webkit-details-marker { display: none; }
.gc-acc summary span { display: grid; }
.gc-acc summary small { font-size: 13px; opacity: .65; }
.gc-acc summary i { width: 9px; height: 9px; border-inline-end: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg); margin-top: -4px; flex: none; transition: transform .15s; }
.gc-acc[open] summary i { transform: rotate(-135deg); margin-top: 4px; }
.gc-acc__body { padding: 4px 14px 2px; }
.gc-designs { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 8px; }
.gc-design { display: grid; gap: 6px; padding: 6px; border: 1.5px solid rgba(0, 0, 0, .14); border-radius: 12px; background: transparent; color: inherit; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; }
.gc-design.is-on { border-color: currentColor; box-shadow: inset 0 0 0 1px currentColor; }
.gc-design__band { display: grid; place-items: center; height: 44px; border-radius: 8px; font-size: 22px; }
.gc-swatches { display: flex; flex-wrap: wrap; gap: 10px; }
.gc-sw { width: 32px; height: 32px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1.5px rgba(0, 0, 0, .18); cursor: pointer; padding: 0; }
.gc-sw.is-on { box-shadow: 0 0 0 2.5px currentColor; }
.gc-images { display: flex; flex-wrap: wrap; gap: 8px; }
.gc-img { position: relative; width: 64px; height: 64px; border-radius: 10px; border: 1.5px solid rgba(0, 0, 0, .14); background: transparent center / cover; color: inherit; font: inherit; font-size: 12px; font-weight: 600; line-height: 1.2; display: grid; place-items: center; text-align: center; cursor: pointer; overflow: hidden; padding: 2px; }
.gc-img.is-on { border-color: currentColor; box-shadow: inset 0 0 0 1px currentColor; }
.gc-img--own input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.gc-see { justify-self: start; margin: 2px 0 8px; text-decoration: underline; }
.gc-fine { font-size: 13px; opacity: .7; margin: 8px 0 0; }
.gc-dialog { width: 600px; max-width: 94vw; }
.gc-desk-only, .gc-desk-block { display: none; }
.gc-buyrow { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 8px; align-items: stretch; }
.gc-design-btn { display: grid; align-content: center; gap: 0; padding: 6px 12px; border: 1.5px solid rgba(0, 0, 0, .18); border-radius: 12px; background: transparent; color: inherit; font: inherit; text-align: start; cursor: pointer; min-width: 0; }
.gc-design-btn b { font-size: 14px; }
.gc-design-btn small { font-size: 12px; opacity: .65; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (min-width: 1024px) {
  .gc-desk-only { display: inline-flex; }
  .gc-desk-block { display: block; }
  .gc-phone-only { display: none; }
  .gc-buyrow { grid-template-columns: minmax(0, 1fr); }
}
/* "Design this email" (phones and tablets): the choices stay on top, the email scrolls under them. */
.gc-sheet { position: relative; display: flex; flex-direction: column; height: 100%; background: var(--q-primary, #fff); color: var(--q-text, inherit); }
.gc-sheet__head { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 10px 6px 16px; }
.gc-sheet__top { flex: none; padding: 0 16px 10px; border-bottom: 1px solid rgba(0, 0, 0, .1); }
.gc-sheet__tabs { display: flex; gap: 4px; margin-bottom: 8px; }
.gc-sheet__tabs button { border: 0; background: none; color: inherit; font: inherit; font-size: 14px; font-weight: 600; padding: 6px 12px; border-radius: 999px; opacity: .6; cursor: pointer; }
.gc-sheet__tabs button.is-on { opacity: 1; background: rgba(0, 0, 0, .07); }
.gc-sheet__row { display: flex; gap: 8px; overflow-x: auto; padding: 2px; -webkit-overflow-scrolling: touch; }
.gc-sheet__row--pad { gap: 12px; padding: 6px 4px; }
.gc-sheet__row > * { flex: none; }
.gc-sheet__row .gc-design { width: 92px; }
.gc-sheet__preview { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 12px 96px; background: rgba(0, 0, 0, .04); }
.gc-sheet__add { position: absolute; inset-inline: 16px; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); min-height: 46px; box-shadow: 0 8px 24px -8px rgba(0, 0, 0, .45); }
</style>

<style>
/* purgecss start ignore */
/* The send-time list (drawn outside the form): the chosen time in the text colour, bold, on a soft band. */
.gc-time-menu .q-item.gc-time-on { color: inherit; font-weight: 700; background: rgba(0, 0, 0, .07); }
/* purgecss end ignore */
</style>
