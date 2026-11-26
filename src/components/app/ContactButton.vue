<template>
  <div
      v-if="contactMethods.length && place"
      ref="wrapEl"
      class="qwoo-contact-btn-wrap"
      :class="{ 'dock-movable': movable }"
      :style="place"
      data-dock
      @pointerdown="drag.down($event, wrapEl)"
      @click.capture="drag.click"
      @contextmenu="movable && $event.preventDefault()"
  >
    <!-- Multiple methods: the options open above the toggle when it's the top button of its corner,
         else sideways toward the middle of the screen, so no other floating button covers them. -->
    <div v-if="contactMethods.length > 1" class="qwoo-contact-options" :style="optionsStyle">
      <a
          v-for="method in contactMethods"
          v-show="expanded"
          :key="method.type + method.href"
          :href="method.href"
          target="_blank"
          rel="noopener"
          class="qwoo-contact-option"
          :class="`qwoo-contact-option--${method.type}`"
          :aria-label="labelFor(method)"
          :title="labelFor(method)"
      >
        <span class="qwoo-contact-icon">
          <img
              v-if="method.type === 'custom' && method.icon"
              :src="method.icon"
              :alt="labelFor(method)"
          />
          <span v-else v-html="icons[method.type] || icons.chat"></span>
        </span>
      </a>
    </div>

    <!-- Single method: the button itself IS that method -->
    <a
        v-if="contactMethods.length === 1"
        :href="contactMethods[0].href"
        target="_blank"
        rel="noopener"
        class="qwoo-contact-fab"
        :class="`qwoo-contact-fab--${contactMethods[0].type}`"
        :aria-label="labelFor(contactMethods[0])"
    >
      <span class="qwoo-contact-icon">
        <img
            v-if="contactMethods[0].type === 'custom' && contactMethods[0].icon"
            :src="contactMethods[0].icon"
            :alt="labelFor(contactMethods[0])"
        />
        <span v-else v-html="icons[contactMethods[0].type] || icons.chat"></span>
      </span>
    </a>

    <!-- Multiple methods: generic toggle -->
    <button
        v-else
        type="button"
        class="qwoo-contact-fab qwoo-contact-fab--toggle"
        @click="expanded = !expanded"
        :aria-label="expanded ? t('Close contact options') : t('Contact us')"
        :aria-expanded="expanded"
    >
      <span class="qwoo-contact-icon" v-html="expanded ? icons.close : icons.chat"></span>
    </button>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { contactMethods, loadContactOptions } from 'src/composables/useContactOptions.js'
import { useI18n } from 'src/i18n/index.js'
import { dock, dockDrag, dockShow, dockStyle } from 'src/utils/floating-dock.js'

const { t } = useI18n()

const expanded = ref(false)
const wrapEl = ref(null)
// Its place comes from the floating buttons layout (Store builder → Floating buttons).
const place = computed(() => dockStyle('contact'))
const movable = computed(() => !!dock.cfg.buttons.contact?.move)
const drag = dockDrag('contact')
const optionsStyle = computed(() => {
  const p = dock.pos.contact
  if (!p) return {}
  const gap = `${dock.cfg.gap}px`
  if (p.moved || p.idx === p.count - 1) return { flexDirection: 'column-reverse', bottom: `calc(100% + ${gap})`, [p.side]: '4px' }
  return { flexDirection: p.side === 'left' ? 'row' : 'row-reverse', [p.side]: `calc(100% + ${gap})`, bottom: '4px' }
})

watch(() => contactMethods.value.length, (n) => dockShow('contact', n > 0), { immediate: true })
onMounted(() => {
  loadContactOptions()
})
onBeforeUnmount(() => dockShow('contact', false))

const labels = {
  whatsapp: t('WhatsApp'),
  phone: t('Call us'),
  email: t('Email us'),
  telegram: t('Telegram'),
}

function labelFor(method) {
  if (method.type === 'custom') return method.label || t('Contact us')
  return labels[method.type] || t('Contact us')
}

// Small, dependency-free inline icon set — avoids pulling in a brand-icon
// font just for this button.
const icons = {
  // WhatsApp's mark from Material Design Icons (mdi-v7, Apache 2.0), centred on its 24 box.
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 14C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.5 11.15 9.61 11 9.73 10.89C9.84 10.78 10 10.6 10.1 10.45C10.23 10.31 10.27 10.2 10.35 10.04C10.43 9.87 10.39 9.73 10.33 9.61C10.27 9.5 9.77 8.26 9.56 7.77C9.36 7.29 9.16 7.35 9 7.34C8.86 7.34 8.7 7.33 8.53 7.33Z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M6.6 10.8c1.4 2.8 3.7 5 6.5 6.5l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.3 1L6.6 10.8z"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M21.9 4.3 18.6 20c-.2 1-.9 1.2-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.6 13.2l-4.7-1.5c-1-.3-1-1 .2-1.5L20.6 3.2c.9-.3 1.6.2 1.3 1.1z"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M12 2C6.5 2 2 5.9 2 10.5c0 2.3 1.1 4.4 3 5.9-.1 1.1-.6 2.4-1.4 3.4-.2.2 0 .5.3.5 1.8-.2 3.4-.9 4.6-1.8 1.1.4 2.3.6 3.5.6 5.5 0 10-3.9 10-8.6S17.5 2 12 2z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
}

</script>

<style scoped>
/* Placed by the floating buttons layout (floating-dock.js: fixed, its corner, above bars). */
.qwoo-contact-btn-wrap {
  width: var(--dock-size, 52px);
  height: var(--dock-size, 52px);
}

.qwoo-contact-fab {
  width: var(--dock-size, 52px);
  height: var(--dock-size, 52px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--q-on-secondary, #fff);
  background: var(--q-secondary, #333);
  box-shadow: 0 4px 14px rgba(0, 0, 0, .25);
  text-decoration: none;
  border: none;
  cursor: pointer;
}

.qwoo-contact-fab--whatsapp { background: #25D366; color: #fff; }
.qwoo-contact-fab--phone    { background: #2563eb; color: #fff; }
.qwoo-contact-fab--email    { background: #6b7280; color: #fff; }
.qwoo-contact-fab--telegram { background: #229ED9; color: #fff; }

.qwoo-contact-options {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 10px;
}

.qwoo-contact-option {
  width: calc(var(--dock-size, 52px) - 8px);
  height: calc(var(--dock-size, 52px) - 8px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--q-on-secondary, #fff);
  box-shadow: 0 4px 14px rgba(0, 0, 0, .2);
  text-decoration: none;
  background: var(--q-secondary, #333);
}

.qwoo-contact-option--whatsapp { background: #25D366; color: #fff; }
.qwoo-contact-option--phone    { background: #2563eb; color: #fff; }
.qwoo-contact-option--email    { background: #6b7280; color: #fff; }
.qwoo-contact-option--telegram { background: #229ED9; color: #fff; }

/* The icon box follows the button's size; the icon fills it, centred (owner, 2026-11-26: it sat off-centre). */
.qwoo-contact-icon {
  width: calc(var(--dock-size, 52px) * .5);
  height: calc(var(--dock-size, 52px) * .5);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.qwoo-contact-icon > span {
  display: flex;
  width: 100%;
  height: 100%;
}

.qwoo-contact-icon :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.qwoo-contact-icon :deep(img) {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 50%;
}
</style>