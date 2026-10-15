<script setup>
import {matShoppingCart} from "@quasar/extras/material-icons";
import cart from "stores/cart.js";

const emit = defineEmits(['toggle-cart'])

</script>

<template>
  <q-btn flat dense :icon="matShoppingCart" :aria-label="t('View cart')" data-action="cart" @click="emit('toggle-cart')">
    <q-no-ssr>
      <q-badge v-if="cart.state.items_count > 0" floating color="red">{{ cart.state.items_count }}</q-badge>
    </q-no-ssr>
  </q-btn>
</template>

<style scoped>

</style>