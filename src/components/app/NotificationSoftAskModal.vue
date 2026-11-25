<template>
  <q-dialog
      :model-value="modelValue"
      @update:model-value="(val) => !val && emit('dismiss')"
      position="bottom"
      seamless
  >
    <q-card class="notification-soft-ask q-pa-md">
      <q-card-section class="row items-center no-wrap q-pb-none">
        <q-icon :name="matNotificationsActive" size="28px" class="q-mr-sm" />
        <div class="text-h6 notification-soft-ask__title">{{ texts?.title || t('Never miss an update') }}</div>
      </q-card-section>

      <q-card-section class="text-body2 ink-soft">
        {{ texts?.text || t('Turn on notifications to hear about order updates, price drops, and abandoned cart reminders — you can turn them off anytime.') }}
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat no-caps class="notification-soft-ask__no" :label="texts?.no || t('Not now')" @click="emit('dismiss')" />
        <q-btn unelevated no-caps class="notification-soft-ask__yes" :label="texts?.yes || t('Enable notifications')" @click="emit('enable')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { matNotificationsActive } from '@quasar/extras/material-icons'

defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  // { title, text, yes, no } from the store's settings (in the shopper's language); null: the built-in texts.
  texts: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['enable', 'dismiss'])
</script>

<style scoped>
/* In the store's own colours: its page background and text colour (body in app.css), which every
   store keeps readable together. A fixed white card took the store's text colour, which vanished on
   dark stores (cream on white). */
.notification-soft-ask {
  max-width: 420px;
  width: 100%;
  background: var(--q-primary, #fff);
  color: var(--q-secondary, #1d1b2e);
  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  box-shadow: 0 10px 40px rgba(0, 0, 0, .35);
}
.notification-soft-ask__title { color: inherit; }
.notification-soft-ask__no { color: inherit; opacity: .75; }
.notification-soft-ask__yes { background: var(--q-secondary, #1d1b2e); color: var(--q-on-secondary, #fff); }
</style>
