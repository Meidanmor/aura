<script setup>

const props = defineProps({
  data: {
    required: true,
    type: Object
  }
})
const onValidationError = async(ref) => {
  const valid = await ref.validate()
  if (!valid) {
    // Wait a tick for Quasar to focus the first invalid field
    requestAnimationFrame(() => {
      const el = document.activeElement
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({behavior: 'smooth', block: 'center'})
      }
    })
    return
  }
}

const submitForm = async(ref) => {
    console.log(ref)
}
</script>

<template>
  <q-form class="flex" @submit.prevent="submitForm" @validation-error="onValidationError">
    <div v-if="props.data.form_type === 'custom'">
      <div class="inputs-wrap" v-for="(field, index) in props.data.fields" :key="index">
        <div v-if="field.field_type === 'checkbox'">
          <q-field
              borderless
              :model-value="false"
              :rules="[val => (val === true && index === index) || `You must accept ${field.label}`]"
          >
            <template v-slot:control>
              <q-checkbox
                  :v-model="false"
                  :label="field.label"
              />
            </template>
          </q-field>

        </div>
        <div v-else>
          <q-input :type="field.field_type" :label="field.label" filled class="q-mb-sm" :rules="field.required ? [val => !!val || `${field.label} is required`] : ''"/>
        </div>
      </div>
    </div>
    <div v-else-if="props.data.form_type === 'newsletter'">
      <q-input label="First Name *" filled class="q-mb-sm" :rules="[val => !!val || 'First Name is required']"/>
    </div>
    <div v-if="props.data.form_type === 'custom'">
      <q-input label="First Name *" filled class="q-mb-sm" :rules="[val => !!val || 'First Name is required']"/>
    </div>

  </q-form>
</template>

<style scoped>

</style>