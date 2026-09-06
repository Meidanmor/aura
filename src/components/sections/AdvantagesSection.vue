<template>
  <section v-if="data.items?.length" class="advantages-section">
    <div class="container">
      <div class="row q-col-gutter-md">
        <div
            v-for="(item, index) in data.items"
            :key="index"
            class="col-12 col-sm-6 col-md-4"
        >
          <div class="advantage-card">
            <q-icon :name="iconMap[item.icon] || iconMap.shipping" size="40px" class="advantage-card__icon" />
            <h3 v-if="item.title" class="advantage-card__title">{{ item.title }}</h3>
            <p v-if="item.text" class="advantage-card__text">{{ item.text }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
// Keys must match Shop_Settings_Builder::ADVANTAGE_ICONS on the WP side.
const iconMap = {
  shipping: 'local_shipping',
  organic: 'eco',
  guarantee: 'verified',
  returns: 'assignment_return',
  support: 'support_agent',
  quality: 'workspace_premium'
}

defineProps({
  data: {
    type: Object,
    required: true
  },
  sectionId: { type: String, default: '' }
})
</script>

<style scoped>
.advantage-card {
  text-align: center;
  padding: 24px 16px;
}

.advantage-card__icon {
  margin-bottom: 12px;
  color: var(--q-primary, currentColor);
}

.advantage-card__title {
  font-weight: 600;
  margin: 0 0 8px;
}

.advantage-card__text {
  margin: 0;
  color: #666;
}
</style>