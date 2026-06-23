<template>
  <form class="sp-meta" @submit.prevent="onSubmit">
    <div v-for="campo in schema" :key="campo.nombre" class="sp-meta-field">
      <label class="sp-label">
        {{ campo.etiqueta || campo.nombre }}<span v-if="campo.requerido"> *</span>
      </label>
      <select v-if="campo.choices && campo.choices.length" v-model="values[campo.nombre]" :name="campo.nombre" class="sp-input">
        <option v-for="opt in campo.choices" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <input v-else-if="campo.tipo === 'bool'" v-model="values[campo.nombre]" :name="campo.nombre" type="checkbox" />
      <input v-else v-model="values[campo.nombre]" :name="campo.nombre" :type="inputType(campo.tipo)" class="sp-input" />
      <small v-if="campo.ayuda" class="sp-help">{{ campo.ayuda }}</small>
      <small v-if="fieldErrors[campo.nombre]" class="sp-error">{{ fieldErrors[campo.nombre] }}</small>
    </div>

    <div class="sp-actions">
      <button type="submit" class="sp-btn sp-btn--primary" :disabled="loading">
        {{ loading ? labels.guardando : labels.guardar }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useSpLabels } from '../composables/useSpLabels.js'

const props = defineProps({ client: { type: Object, required: true } })
const emit = defineEmits(['saved'])

const labels = useSpLabels()

const schema = ref([])
const values = reactive({})
const fieldErrors = reactive({})
const loading = ref(false)

const inputType = (t) => (t === 'int' || t === 'Decimal' ? 'number' : t === 'date' ? 'date' : 'text')

async function load() {
  const data = await props.client.getMetadatos()
  schema.value = data.schema || []
  Object.keys(values).forEach((k) => delete values[k])
  Object.assign(values, data.values || {})
}

async function onSubmit() {
  loading.value = true
  Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k])
  try {
    const updated = await props.client.patchMetadatos({ ...values })
    emit('saved', updated)
  } catch (e) {
    const body = e.response?.data
    if (body && typeof body === 'object') {
      for (const [k, v] of Object.entries(body)) fieldErrors[k] = Array.isArray(v) ? v.join(' ') : String(v)
    }
  } finally {
    loading.value = false
  }
}

defineExpose({ values, onSubmit })
load()
</script>

<style scoped>
.sp-meta { display: flex; flex-direction: column; gap: 12px; font-family: var(--sp-font); }
.sp-meta-field { display: flex; flex-direction: column; gap: 4px; }
.sp-help { font-size: 11px; color: var(--sp-text-muted); }
.sp-error { font-size: 11px; }
.sp-actions { justify-content: flex-end; }
</style>
