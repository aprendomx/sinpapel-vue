<template>
  <div class="sp-panel">
    <header class="sp-panel__head">
      <state-badge :estado="currentState" :color="currentStateColor" />
      <button class="sp-btn sp-btn--primary" :disabled="!store.estados.length" @click="dialog = true">
        {{ labels.cambiarEstado }}
      </button>
    </header>

    <nav class="sp-panel__tabs">
      <button v-for="t in visibleTabs" :key="t.key" class="sp-tab" :class="{ 'is-active': tab === t.key }" @click="tab = t.key">
        {{ t.label }}
      </button>
    </nav>

    <section class="sp-panel__body">
      <history-timeline
        v-show="tab === 'historial'"
        :entries="store.historial"
        :page="historialPage"
        :page-size="20"
        :count="store.historialCount"
        @prev="onPrevPage"
        @next="onNextPage"
      />
      <preview-transition-panel v-if="tab === 'preview'" :client="store.client" :target-state="previewTarget" />
      <div v-if="tab === 'preview'" class="sp-panel__preview-pick">
        <label class="sp-label">{{ labels.estadoDestino }}</label>
        <select v-model="previewTarget" class="sp-input">
          <option value="">—</option>
          <option v-for="e in store.estados" :key="e.id ?? e.nombre" :value="e.nombre">{{ e.nombre }}</option>
        </select>
      </div>
      <requisitos-panel v-if="tab === 'requisitos'" :client="store.client" />
      <documentos-panel v-if="tab === 'documentos'" :client="store.client" />
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
import { ref, computed, watch, onUnmounted, provide } from 'vue'
import { useSeguimientoStore } from '../stores/useSeguimientoStore.js'
import es from '../locales/es.js'
import en from '../locales/en.js'
import StateBadge from './StateBadge.vue'
import HistoryTimeline from './HistoryTimeline.vue'
import TransitionDialog from './TransitionDialog.vue'
import PreviewTransitionPanel from './PreviewTransitionPanel.vue'
import MetadatosForm from './MetadatosForm.vue'
import SlaStatusPanel from './SlaStatusPanel.vue'
import RequisitosPanel from './RequisitosPanel.vue'
import DocumentosPanel from './DocumentosPanel.vue'

const props = defineProps({
  axios: { type: Object, required: true },
  basePath: { type: String, default: '/sinpapel/api' },
  resource: { type: String, required: true },
  pk: { type: [Number, String], required: true },
  currentState: { type: String, default: '' },
  canEvaluateSla: { type: Boolean, default: false },
  locale: { type: String, default: 'es' },
})

provide('spLocale', computed(() => props.locale))

const store = useSeguimientoStore({
  axios: props.axios, basePath: props.basePath, resource: props.resource, pk: props.pk,
})

onUnmounted(() => store.cancel())

const dialog = ref(false)
const tab = ref('historial')
const previewTarget = ref('')
const historialPage = ref(1)

const currentStateColor = computed(() => {
  const found = store.estados.find((e) => e.nombre === props.currentState)
  return found?.color || ''
})

const LOCALES = { es, en }
const labels = new Proxy({}, {
  get(target, key) {
    return (LOCALES[props.locale] || LOCALES.es)[key]
  },
})

const visibleTabs = computed(() => {
  const tabs = [
    { key: 'historial', label: labels.historial },
    { key: 'requisitos', label: labels.requisitos },
    { key: 'documentos', label: labels.documentos },
    { key: 'preview', label: labels.previsualizar },
    { key: 'metadatos', label: labels.metadatos },
  ]
  if (props.canEvaluateSla) tabs.push({ key: 'sla', label: labels.sla })
  return tabs
})

async function load(page = historialPage.value) {
  await store.cargarEstados()
  await store.cargarHistorial(page)
}

async function onTransitioned() {
  historialPage.value = 1
  await load()
}

async function onPrevPage() {
  if (historialPage.value > 1) {
    historialPage.value -= 1
    await load()
  }
}

async function onNextPage() {
  historialPage.value += 1
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
</style>
