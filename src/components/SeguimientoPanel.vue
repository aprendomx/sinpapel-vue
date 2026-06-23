<template>
  <div class="sp-panel">
    <header class="sp-panel__head">
      <state-badge :estado="currentState" />
      <button class="sp-btn sp-btn--primary" :disabled="!store.estados.length" @click="dialog = true">
        Cambiar estado
      </button>
    </header>

    <nav class="sp-panel__tabs">
      <button v-for="t in visibleTabs" :key="t.key" class="sp-tab" :class="{ 'is-active': tab === t.key }" @click="tab = t.key">
        {{ t.label }}
      </button>
    </nav>

    <section class="sp-panel__body">
      <history-timeline v-show="tab === 'historial'" :entries="store.historial" />
      <preview-transition-panel v-if="tab === 'preview'" :client="store.client" :target-state="previewTarget" />
      <div v-if="tab === 'preview'" class="sp-panel__preview-pick">
        <label class="sp-label">Estado destino</label>
        <select v-model="previewTarget" class="sp-input">
          <option value="">—</option>
          <option v-for="e in store.estados" :key="e.id ?? e.nombre" :value="e.nombre">{{ e.nombre }}</option>
        </select>
      </div>
      <metadatos-form v-if="tab === 'metadatos'" :client="store.client" @saved="store.cargarMetadatos()" />
      <sla-status-panel v-if="tab === 'sla' && canEvaluateSla" :client="store.client" />
    </section>

    <transition-dialog
      v-model="dialog"
      :client="store.client"
      :current-state="currentState"
      :estados="store.estados"
      @transitioned="onTransitioned"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSeguimientoStore } from '../stores/useSeguimientoStore.js'
import StateBadge from './StateBadge.vue'
import HistoryTimeline from './HistoryTimeline.vue'
import TransitionDialog from './TransitionDialog.vue'
import PreviewTransitionPanel from './PreviewTransitionPanel.vue'
import MetadatosForm from './MetadatosForm.vue'
import SlaStatusPanel from './SlaStatusPanel.vue'

const props = defineProps({
  axios: { type: Object, required: true },
  basePath: { type: String, default: '/sinpapel/api' },
  resource: { type: String, required: true },
  pk: { type: [Number, String], required: true },
  currentState: { type: String, default: '' },
  canEvaluateSla: { type: Boolean, default: false },
})

const store = useSeguimientoStore({
  axios: props.axios, basePath: props.basePath, resource: props.resource, pk: props.pk,
})

const dialog = ref(false)
const tab = ref('historial')
const previewTarget = ref('')

const visibleTabs = computed(() => {
  const tabs = [
    { key: 'historial', label: 'Historial' },
    { key: 'preview', label: 'Previsualizar' },
    { key: 'metadatos', label: 'Metadatos' },
  ]
  if (props.canEvaluateSla) tabs.push({ key: 'sla', label: 'SLA' })
  return tabs
})

async function load() {
  await store.cargarEstados()
  await store.cargarHistorial()
}

async function onTransitioned() {
  await load()
}

watch(() => tab.value, (t) => { if (t === 'metadatos') store.cargarMetadatos() })

load()
</script>

<style scoped>
.sp-panel { font-family: var(--sp-font); border: 1px solid var(--sp-border); border-radius: var(--sp-radius); overflow: hidden; background: var(--sp-surface); }
.sp-panel__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--sp-border); background: var(--sp-surface-alt); }
.sp-panel__tabs { display: flex; border-bottom: 1px solid var(--sp-border); }
.sp-tab { padding: 10px 16px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font: inherit; font-weight: 600; color: var(--sp-text-muted); }
.sp-tab.is-active { color: var(--sp-color-primary); border-bottom-color: var(--sp-color-primary); }
.sp-panel__body { padding: 16px; }
.sp-panel__preview-pick { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; max-width: 280px; }
.sp-label { font-size: 12px; font-weight: 600; color: var(--sp-text); }
.sp-input { padding: 7px 10px; border: 1px solid var(--sp-border); border-radius: 6px; font: inherit; }
.sp-btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font: inherit; font-weight: 600; }
.sp-btn--primary { background: var(--sp-color-primary); color: var(--sp-color-on-primary); }
.sp-btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
