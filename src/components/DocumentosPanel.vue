<template>
  <div class="sp-docs">
    <p v-if="reqLoading" class="sp-docs__muted">{{ labels.cargando }}</p>
    <p v-else-if="!tipos.length" class="sp-docs__muted">{{ labels.sinTiposCarga }}</p>

    <form v-else class="sp-docs__form" @submit.prevent="onSubmit">
      <div class="sp-docs__field">
        <label class="sp-label">{{ labels.tipoDocumento }} <span aria-hidden="true">*</span></label>
        <select v-model.number="selectedTipoId" class="sp-input">
          <option :value="null" disabled>{{ labels.selecciona }}</option>
          <option v-for="t in tipos" :key="t.tipo_documento_id" :value="t.tipo_documento_id">
            {{ t.tipo_documento }}
          </option>
        </select>
        <small v-if="fieldErrors.tipo_documento" class="sp-error">{{ fieldErrors.tipo_documento }}</small>
      </div>

      <div class="sp-docs__field">
        <label class="sp-label">{{ labels.documento }} <span aria-hidden="true">*</span></label>
        <select v-model.number="documentoId" class="sp-input" :disabled="!documentoOpciones.length">
          <option :value="null" disabled>{{ labels.selecciona }}</option>
          <option v-for="d in documentoOpciones" :key="d.id" :value="d.id">{{ d.nombre }}</option>
        </select>
        <small v-if="fieldErrors.documento" class="sp-error">{{ fieldErrors.documento }}</small>
      </div>

      <div class="sp-docs__field">
        <label class="sp-label">{{ labels.archivo }} <span aria-hidden="true">*</span></label>
        <input ref="fileEl" type="file" class="sp-input" required @change="onFile" />
        <small v-if="fieldErrors.archivo" class="sp-error">{{ fieldErrors.archivo }}</small>
      </div>

      <div class="sp-actions">
        <button type="submit" class="sp-btn sp-btn--primary" :disabled="loading || !file || !documentoId">
          {{ loading ? labels.subiendo : labels.subir }}
        </button>
      </div>
      <p v-if="formError" class="sp-error">{{ formError }}</p>
    </form>

    <p v-if="listLoading" class="sp-docs__muted">{{ labels.cargando }}</p>
    <p v-else-if="!items.length" class="sp-docs__muted">{{ labels.sinDocumentos }}</p>
    <ul v-else class="sp-docs__list">
      <li v-for="d in items" :key="d.id" class="sp-docs__item">
        <span class="sp-docs__meta">
          <span class="sp-docs__name">{{ d.tipo_documento || ('#' + (d.documento ?? d.id)) }}</span>
          <span class="sp-docs__pct">{{ d.porcentaje }}%</span>
          <a v-if="d.archivo" :href="d.archivo" target="_blank" rel="noopener" class="sp-docs__link">{{ labels.verArchivo }}</a>
        </span>
        <button
          type="button"
          class="sp-btn sp-btn--ghost sp-docs__del"
          :disabled="loading"
          :aria-label="labels.eliminar"
          @click="onDelete(d.id)"
        >
          {{ labels.eliminar }}
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSpLabels } from '../composables/useSpLabels.js'

const props = defineProps({ client: { type: Object, required: true } })
const emit = defineEmits(['changed'])

const labels = useSpLabels()

const items = ref([])
const file = ref(null)
const fileEl = ref(null)

// Tipos requeridos por el estado actual y sus Documentos disponibles vienen de
// `requisitos()` (nivel requisito_documento). El usuario elige tipo y, dentro,
// cuál Documento sube (ej. tipo "Identificación" → "Pasaporte" / "INE").
const tipos = ref([])
const selectedTipoId = ref(null)
const documentoId = ref(null)
const fieldErrors = ref({})
const formError = ref('')
const loading = ref(false)
const listLoading = ref(false)
const reqLoading = ref(false)

const selectedTipo = computed(
  () => tipos.value.find((t) => t.tipo_documento_id === selectedTipoId.value) || null,
)
const documentoOpciones = computed(() => selectedTipo.value?.documentos_disponibles || [])

// Al cambiar el tipo, resetea el Documento; si el tipo tiene una sola opción,
// autoselecciónala para ahorrar un clic.
watch(selectedTipoId, () => {
  const opts = documentoOpciones.value
  documentoId.value = opts.length === 1 ? opts[0].id : null
})

function onFile(e) {
  file.value = e.target.files?.[0] || null
}

function clearErrors() {
  fieldErrors.value = {}
  formError.value = ''
}

async function loadRequisitos() {
  reqLoading.value = true
  try {
    const data = await props.client.requisitos()
    const reqs = (Array.isArray(data) ? data : []).filter(
      (r) => r.nivel === 'requisito_documento' && r.tipo_documento_id != null,
    )
    tipos.value = reqs
    if (reqs.length === 1) selectedTipoId.value = reqs[0].tipo_documento_id
  } catch (e) {
    formError.value = e.response?.data?.detail || e.message
  } finally {
    reqLoading.value = false
  }
}

async function loadList() {
  listLoading.value = true
  try {
    items.value = await props.client.listDocumentos()
  } catch (e) {
    formError.value = e.response?.data?.detail || e.message
  } finally {
    listLoading.value = false
  }
}

async function onSubmit() {
  if (!file.value || !documentoId.value) return
  clearErrors()
  loading.value = true
  try {
    await props.client.uploadDocumento({ archivo: file.value, documento: documentoId.value })
    file.value = null
    if (fileEl.value) fileEl.value.value = ''
    selectedTipoId.value = null
    documentoId.value = null
    await loadList()
    emit('changed')
  } catch (e) {
    const body = e.response?.data
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const next = {}
      for (const [k, v] of Object.entries(body)) {
        const msg = Array.isArray(v) ? v.join(' ') : String(v)
        if (['archivo', 'documento', 'tipo_documento'].includes(k)) next[k] = msg
        else formError.value = msg
      }
      fieldErrors.value = next
    } else {
      formError.value = e.message
    }
  } finally {
    loading.value = false
  }
}

async function onDelete(id) {
  clearErrors()
  loading.value = true
  try {
    await props.client.deleteDocumento(id)
    await loadList()
    emit('changed')
  } catch (e) {
    formError.value = e.response?.data?.detail || e.message
  } finally {
    loading.value = false
  }
}

defineExpose({ items, tipos, selectedTipoId, documentoId, onSubmit, onDelete, loadList, loadRequisitos })
loadRequisitos()
loadList()
</script>

<style scoped>
.sp-docs { display: flex; flex-direction: column; gap: 16px; font-family: var(--sp-font); }
.sp-docs__form { display: flex; flex-direction: column; gap: 10px; }
.sp-docs__field { display: flex; flex-direction: column; gap: 4px; }
.sp-docs__muted { color: var(--sp-text-muted); font-size: 13px; margin: 0; }
.sp-docs__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.sp-docs__item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px; border: 1px solid var(--sp-border); border-radius: 6px; }
.sp-docs__meta { display: flex; align-items: center; gap: 10px; font-size: 13px; flex-wrap: wrap; }
.sp-docs__name { font-weight: 600; color: var(--sp-text); }
.sp-docs__pct { color: var(--sp-text-muted); }
.sp-docs__link { color: var(--sp-color-primary); font-size: 12px; }
.sp-docs__del { padding: 4px 10px; font-size: 12px; }
</style>
