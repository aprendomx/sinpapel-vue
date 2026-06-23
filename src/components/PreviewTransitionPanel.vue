<template>
  <div class="sp-preview">
    <div v-if="loading" class="sp-preview__muted">Evaluando…</div>
    <template v-else-if="report">
      <div class="sp-preview__verdict" :class="report.permitido ? 'is-ok' : 'is-block'">
        <q-icon :name="report.permitido ? 'check_circle' : 'block'" size="16px" />
        {{ report.permitido ? 'Permitida' : 'Bloqueada' }}
      </div>

      <section v-for="grp in groups" :key="grp.key" v-show="grp.items.length" class="sp-preview__group">
        <h4>{{ grp.title }}</h4>
        <ul>
          <li v-for="(it, i) in grp.items" :key="i">{{ render(it) }}</li>
        </ul>
      </section>
    </template>
    <div v-else class="sp-preview__muted">Selecciona un estado destino para previsualizar.</div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  client: { type: Object, required: true },
  targetState: { type: String, default: '' },
})

const report = ref(null)
const loading = ref(false)

const groups = computed(() => {
  if (!report.value) return []
  return [
    { key: 'razones_bloqueo', title: 'Razones de bloqueo', items: report.value.razones_bloqueo || [] },
    { key: 'documentos_faltantes', title: 'Documentos faltantes', items: report.value.documentos_faltantes || [] },
    { key: 'predicados_fallidos', title: 'Predicados fallidos', items: report.value.predicados_fallidos || [] },
    { key: 'aprobadores_requeridos', title: 'Aprobadores requeridos', items: report.value.aprobadores_requeridos || [] },
    { key: 'side_effects', title: 'Efectos secundarios', items: report.value.side_effects || [] },
    { key: 'historial_reciente', title: 'Historial reciente', items: report.value.historial_reciente || [] },
  ]
})

const render = (it) =>
  typeof it === 'string' ? it : (it.detalle || it.nombre || JSON.stringify(it))

async function load() {
  if (!props.targetState) { report.value = null; return }
  loading.value = true
  try {
    report.value = await props.client.previewTransition(props.targetState)
  } finally {
    loading.value = false
  }
}

watch(() => props.targetState, load, { immediate: true })
</script>

<style scoped>
.sp-preview { font-family: var(--sp-font); display: flex; flex-direction: column; gap: 12px; }
.sp-preview__muted { color: var(--sp-text-muted); font-size: 13px; }
.sp-preview__verdict { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: 6px 12px; border-radius: 20px; width: fit-content; }
.sp-preview__verdict.is-ok { background: color-mix(in srgb, var(--sp-ok) 14%, white); color: var(--sp-ok); }
.sp-preview__verdict.is-block { background: color-mix(in srgb, var(--sp-danger) 12%, white); color: var(--sp-danger); }
.sp-preview__group h4 { margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--sp-text-muted); }
.sp-preview__group ul { margin: 0; padding-left: 18px; }
.sp-preview__group li { font-size: 13px; color: var(--sp-text); }
</style>
