<script setup>
import {matMenu} from "@quasar/extras/material-icons";
import NavMenu from "components/app/NavMenu.vue";
import {computed} from "vue";
import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
  // The header menu: [ { label, url, new_tab, external, children } ]; null before the store published one.
  menu: {
    type: Array,
    default: null
  }
})

const d = computed(() => props.data.data || {})

const cssVars = computed(() => {
  const vars = {}
  if(d.value?.enable_mobile_menu) {
    if(d.value?.mobile_menu_breakpoint && d.value.mobile_menu_breakpoint !== 'custom') {
      setResponsiveVar(vars, '--mobile-menu-breakpoint', d.value.mobile_menu_breakpoint, toCssLength)
    } else {
      setResponsiveVar(vars, '--mobile-menu-breakpoint', d.value.mobile_menu_custom_breakpoint ?? '990', toCssLength)
    }
  }
  return vars
})

</script>

<template>
  <div :style="cssVars">
  <NavMenu v-if="Array.isArray(menu)" :items="menu" />
  </div>
  <!-- Mobile Menu Toggle -->
  <div v-if="d.enable_mobile_menu && d.mobile_menu_breakpoint !== 'none'" :style="cssVars">
    <q-btn flat dense :icon="matMenu" :aria-label="t('Open menu')" data-action="menu" class="lt-md" @click="emit('open-menu')" />
  </div>
</template>

<style scoped>

</style>