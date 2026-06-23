<template>
  <div class="sp-sla">
    <button class="sp-btn sp-btn--primary" :disabled="loading" @click="evaluate">
      {{ loading ? labels.evaluando : labels.evaluarSLA }}
    </button>

    <ul v-if="actions.length" class="sp-sla__list">
      <li v-for="(a, i) in actions" :key="i">
        <strong>{{ a.accion || a.action || 'acción' }}</strong>
        <span v-if="a.estado"> · {{ a.estado }}</span>
      </li>
    </ul>
    <p v-else-if="evaluated" class="sp-sla__muted">{{ labels.sinAcciones }}</p>
    <p v-if="error" class="sp-error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSpLabels } from '../composables/useSpLabels.js'

const props = defineProps({ client: { type: Object, required: true } })

const labels = useSpLabels()

const actions = ref([])
const loading = ref(false)
const evaluated = ref(false)
const error = ref('')

async function evaluate() {
  loading.value = true
  error.value = ''
  try {
    actions.value = await props.client.slaStatus()
    evaluated.value = true
  } catch (e) {
    error.value = e.response?.data?.detail || e.message
  } finally {
    loading.value = false
  }
}

defineExpose({ evaluate })
</script>

<style scoped>
.sp-sla { display: flex; flex-direction: column; gap: 10px; font-family: var(--sp-font); }
.sp-sla__list { margin: 0; padding-left: 18px; }
.sp-sla__list li { font-size: 13px; color: var(--sp-text); }
.sp-sla__muted { color: var(--sp-text-muted); font-size: 13px; margin: 0; }
.sp-btn { width: fit-content; }
</style>
