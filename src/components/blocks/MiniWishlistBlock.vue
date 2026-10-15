<script setup>
import {matFavoriteBorder} from "@quasar/extras/material-icons";
import wishlist from "stores/wishlist.js";

const emit = defineEmits(['toggle-wishlist']);
</script>

<template>
  <q-btn flat dense :icon="matFavoriteBorder" :aria-label="t('Add to wishlist')" data-action="wishlist" @click="emit('toggle-wishlist')" class="q-ml-sm q-mr-sm">
    <q-no-ssr>
      <q-badge v-if="wishlist.state.items && Object.keys(wishlist.state.items).length > 0" floating color="red">{{ Object.keys(wishlist.state.items).length }}</q-badge>
    </q-no-ssr>
  </q-btn>
</template>

<style scoped>

</style>