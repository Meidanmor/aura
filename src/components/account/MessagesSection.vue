<template>
  <div class="my-msg" data-clarity-mask="True">
    <div v-if="!mounted || (state.loading && !state.list.length)" class="my-msg__wait"><q-spinner size="26px" /></div>
    <p v-else-if="state.failed" class="text-negative">{{ t('Your messages couldn\'t be loaded. Try again in a moment.') }}</p>
    <template v-else-if="open">
      <button type="button" class="help-link" @click="close">‹ {{ t('All messages') }}</button>
      <h3 class="my-msg__h">{{ current?.topic || t('Message') }}</h3>
      <HelpThread :thread-key="open" />
    </template>
    <template v-else>
      <p v-if="!state.list.length" class="my-msg__empty">{{ t('No messages yet.') }}</p>
      <ul v-else class="my-msg__list">
        <li v-for="c in state.list" :key="c.k">
          <button type="button" class="help-row help-row--conv" @click="open = c.k">
            <b>{{ c.topic || t('Message') }}<i v-if="c.answered" class="help-new">{{ t('Answered') }}</i><i v-else-if="c.status === 'solved'" class="my-msg__done">{{ t('Solved') }}</i></b>
            <span>{{ c.preview }}</span>
            <small>{{ when(c.updated) }}<template v-if="c.order"> · {{ t('Order #{n}', { n: c.order }) }}</template></small>
          </button>
        </li>
      </ul>
      <button v-if="canWrite" type="button" class="help-btn help-btn--main" @click="openHelp({ view: 'write' })">{{ t('Write to us') }}</button>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import HelpThread from 'src/components/help/HelpThread.vue'
import { helpConfig, openHelp } from 'src/composables/useHelp.js'
import { useMyMessages } from 'src/composables/useMyMessages.js'
import { useI18n } from 'src/i18n/index.js'

/** My account → Messages: the shopper's conversations with the store, each one opening in place. */
const { t } = useI18n()
const { state, reload } = useMyMessages()
const mounted = ref(false)
const open = ref('')
const canWrite = ref(false)
const current = computed(() => state.list.find((c) => c.k === open.value))

const when = (at) => {
  try {
    return new Date(at * 1000).toLocaleDateString(document.documentElement.lang || undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}
function close() {
  open.value = ''
  reload()
}
onMounted(() => {
  mounted.value = true
  canWrite.value = !!helpConfig()?.write
  reload()
})
</script>

<style scoped>
.my-msg { display: grid; gap: 12px; }
.my-msg__wait { display: grid; place-items: center; padding: 24px 0; }
.my-msg__empty { margin: 0; opacity: .7; }
.my-msg__h { margin: 0; font-size: 1.1rem; line-height: 1.3; }
.my-msg__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.my-msg__list small { opacity: .7; font-size: 12.5px; }
.my-msg__done { font-style: normal; font-size: 11.5px; font-weight: 600; margin-inline-start: 8px; padding: 1px 8px; border-radius: 999px; background: rgba(0, 0, 0, .07); }
</style>
