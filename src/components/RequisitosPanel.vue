<template>
  <div class="sp-req">
    <p v-if="loading" class="sp-req__muted">{{ labels.cargando }}</p>
    <p v-else-if="error" class="sp-error">{{ error }}</p>
    <p v-else-if="!items.length" class="sp-req__muted">{{ labels.sinRequisitos }}</p>

    <ul v-else class="sp-req__list">
      <li v-for="(r, i) in items" :key="i" class="sp-req__item" :class="{ 'is-ok': r.satisfecho }">
        <span class="sp-req__mark" :aria-label="r.satisfecho ? labels.satisfecho : labels.pendiente">
          {{ r.satisfecho ? '✓' : '○' }}
        </span>
        <span class="sp-req__body">
          <span class="sp-req__title">{{ r.tipo_documento || r.nivel }}</span>
          <span v-if="r.porcentaje_requerido != null" class="sp-req__pct">
            {{ r.porcentaje_actual ?? 0 }}% / {{ r.porcentaje_requerido }}%
          </span>
          <small v-if="r.mensaje" class="sp-req__msg">{{ r.mensaje }}</small>
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSpLabels } from '../composables/useSpLabels.js'

const props = defineProps({ client: { type: Object, required: true } })

const labels = useSpLabels()

const items = ref([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = await props.client.requisitos()
  } catch (e) {
    error.value = e.response?.data?.detail || e.message
  } finally {
    loading.value = false
  }
}

defineExpose({ load, items })
load()
</script>

<style scoped>
.sp-req { display: flex; flex-direction: column; gap: 8px; font-family: var(--sp-font); }
.sp-req__muted { color: var(--sp-text-muted); font-size: 13px; margin: 0; }
.sp-req__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.sp-req__item { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border: 1px solid var(--sp-border); border-radius: 6px; }
.sp-req__item.is-ok { border-color: var(--sp-color-primary); }
.sp-req__mark { font-weight: 700; color: var(--sp-text-muted); }
.sp-req__item.is-ok .sp-req__mark { color: var(--sp-color-primary); }
.sp-req__body { display: flex; flex-direction: column; gap: 2px; }
.sp-req__title { font-weight: 600; font-size: 13px; color: var(--sp-text); }
.sp-req__pct { font-size: 12px; color: var(--sp-text-muted); }
.sp-req__msg { font-size: 11px; color: var(--sp-text-muted); }
</style>
