<template>
  <div class="sp-docs">
    <form class="sp-docs__form" @submit.prevent="onSubmit">
      <div class="sp-docs__field">
        <label class="sp-label">{{ labels.archivo }} <span aria-hidden="true">*</span></label>
        <input ref="fileEl" type="file" class="sp-input" required @change="onFile" />
        <small v-if="fieldErrors.archivo" class="sp-error">{{ fieldErrors.archivo }}</small>
      </div>

      <div class="sp-docs__row">
        <div class="sp-docs__field">
          <label class="sp-label">{{ labels.documentoId }}</label>
          <input v-model.number="form.documento" type="number" min="1" class="sp-input" :placeholder="labels.opcional" />
          <small v-if="fieldErrors.documento" class="sp-error">{{ fieldErrors.documento }}</small>
        </div>
        <div class="sp-docs__field">
          <label class="sp-label">{{ labels.tipoDocumentoId }}</label>
          <input v-model.number="form.tipo_documento" type="number" min="1" class="sp-input" :placeholder="labels.opcional" />
          <small v-if="fieldErrors.tipo_documento" class="sp-error">{{ fieldErrors.tipo_documento }}</small>
        </div>
        <div class="sp-docs__field sp-docs__field--pct">
          <label class="sp-label">{{ labels.porcentaje }}</label>
          <input v-model.number="form.porcentaje" type="number" min="0" max="100" class="sp-input" />
        </div>
      </div>

      <small class="sp-docs__hint">{{ labels.documentoOTipoHint }}</small>

      <div class="sp-actions">
        <button type="submit" class="sp-btn sp-btn--primary" :disabled="loading || !file">
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
import { ref, reactive } from 'vue'
import { useSpLabels } from '../composables/useSpLabels.js'

const props = defineProps({ client: { type: Object, required: true } })
const emit = defineEmits(['changed'])

const labels = useSpLabels()

const items = ref([])
const file = ref(null)
const fileEl = ref(null)
const form = reactive({ documento: null, tipo_documento: null, porcentaje: 100 })
const fieldErrors = reactive({})
const formError = ref('')
const loading = ref(false)
const listLoading = ref(false)

function onFile(e) {
  file.value = e.target.files?.[0] || null
}

function clearErrors() {
  Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k])
  formError.value = ''
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
  if (!file.value) return
  clearErrors()
  loading.value = true
  try {
    await props.client.uploadDocumento({
      archivo: file.value,
      documento: form.documento || undefined,
      tipo_documento: form.tipo_documento || undefined,
      porcentaje: form.porcentaje,
    })
    file.value = null
    if (fileEl.value) fileEl.value.value = ''
    form.documento = null
    form.tipo_documento = null
    form.porcentaje = 100
    await loadList()
    emit('changed')
  } catch (e) {
    const body = e.response?.data
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      for (const [k, v] of Object.entries(body)) {
        const msg = Array.isArray(v) ? v.join(' ') : String(v)
        if (k in fieldErrors || ['archivo', 'documento', 'tipo_documento'].includes(k)) fieldErrors[k] = msg
        else formError.value = msg
      }
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

defineExpose({ items, onSubmit, onDelete, loadList })
loadList()
</script>

<style scoped>
.sp-docs { display: flex; flex-direction: column; gap: 16px; font-family: var(--sp-font); }
.sp-docs__form { display: flex; flex-direction: column; gap: 10px; }
.sp-docs__row { display: flex; gap: 12px; flex-wrap: wrap; }
.sp-docs__field { display: flex; flex-direction: column; gap: 4px; flex: 1 1 140px; }
.sp-docs__field--pct { flex: 0 0 100px; }
.sp-docs__hint { font-size: 11px; color: var(--sp-text-muted); }
.sp-docs__muted { color: var(--sp-text-muted); font-size: 13px; margin: 0; }
.sp-docs__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.sp-docs__item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px; border: 1px solid var(--sp-border); border-radius: 6px; }
.sp-docs__meta { display: flex; align-items: center; gap: 10px; font-size: 13px; flex-wrap: wrap; }
.sp-docs__name { font-weight: 600; color: var(--sp-text); }
.sp-docs__pct { color: var(--sp-text-muted); }
.sp-docs__link { color: var(--sp-color-primary); font-size: 12px; }
.sp-docs__del { padding: 4px 10px; font-size: 12px; }
</style>
