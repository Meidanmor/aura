<template>
  <div>
    <q-banner
      v-if="cart.state.offline"
      class="bg-orange text-white q-pa-sm"
      dense
    >
      <template #avatar>
        <q-icon :name="matWifiOff" />
      </template>

      {{ t('You are currently offline. Some features may be limited.') }}
    </q-banner>

    <router-view />
  </div>
</template>

<script setup>
import {matWifiOff} from '@quasar/extras/material-icons'
import cart from "src/stores/cart.js";
import { onMounted } from "vue";
import { useMeta } from 'quasar'
import { useI18n } from 'src/i18n/index.js'

// The page's language and direction (the CSS has rules for both directions).
const i18n = useI18n()
useMeta({ htmlAttr: { lang: i18n.lang, dir: i18n.dir } })
import { useRouter } from "vue-router";

const router = useRouter();

onMounted(async () => {
  if (!cart.state.offline) return

  const navEntries = performance.getEntriesByType('navigation')

  const isReload =
    navEntries.length &&
    navEntries[0].type === 'reload'

  if (!isReload) return

  const originalPath =
    window.location.pathname

  // avoid loop
  if (router.currentRoute.value.path !== originalPath) {
    await router.replace(originalPath)
  }
})
</script>