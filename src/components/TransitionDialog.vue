<template>
  <q-dialog v-model="visible" persistent>
    <q-card
      ref="dialogRef"
      class="sp-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sp-dialog-title"
      @keydown="onKeydown"
    >
      <div class="sp-dialog__head">
        <q-icon name="swap_horiz" size="18px" />
        <span id="sp-dialog-title">{{ labels.cambiarEstado }}</span>
        <q-space />
        <q-btn icon="close" flat round dense size="sm" @click="visible = false" />
      </div>

      <div class="sp-dialog__current">
        <span class="sp-dialog__label">{{ labels.estadoActual }}</span>
        <state-badge :estado="currentState" />
      </div>

      <q-card-section>
        <q-form @submit="onSubmit" class="sp-form">
          <div class="sp-field">
            <label class="sp-label">{{ labels.nuevoEstado }} *</label>
            <select v-model="tx.targetState.value" class="sp-select">
              <option :value="null" disabled>{{ labels.selecciona }}</option>
              <option v-for="e in estados" :key="e.id ?? e.nombre" :value="e.nombre">
                {{ (e.nombre || '').replace(/_/g, ' ') }}
              </option>
            </select>
            <p v-if="tx.errors.targetState" class="sp-error">{{ tx.errors.targetState }}</p>
          </div>

          <div class="sp-field">
            <label class="sp-label">{{ labels.comentarios }}</label>
            <textarea v-model="tx.comentarios.value" rows="3" class="sp-input"></textarea>
          </div>

          <div class="sp-field">
            <label class="sp-label">{{ labels.montoAprobado }}</label>
            <input v-model.number="tx.montoAprobado.value" type="number" class="sp-input" />
            <p v-if="tx.errors.montoAprobado" class="sp-error">{{ tx.errors.montoAprobado }}</p>
          </div>

          <div class="sp-field">
            <label class="sp-label">{{ labels.condiciones }}</label>
            <textarea v-model="tx.condiciones.value" rows="2" class="sp-input"></textarea>
          </div>

          <!-- Signature backend selector -->
          <fieldset class="sp-sig">
            <legend>{{ labels.firma }}</legend>
            <select v-model="tx.signatureBackend.value" class="sp-select">
              <option :value="null">{{ labels.sinFirma }}</option>
              <option value="fiel">{{ labels.fiel }}</option>
              <option value="manual">{{ labels.manual }}</option>
              <option value="fake">{{ labels.fake }}</option>
            </select>

            <template v-if="tx.signatureBackend.value === 'fiel'">
              <select v-model="tx.signatureMode.value" class="sp-select">
                <option value="client-side">{{ labels.cliente }}</option>
                <option value="server-side">{{ labels.servidor }}</option>
              </select>
              <template v-if="tx.signatureMode.value === 'client-side'">
                <input v-model="tx.signatureFields.firma_b64" placeholder="firma_b64" class="sp-input" />
                <input v-model="tx.signatureFields.certificado_cer_b64" placeholder="certificado_cer_b64" class="sp-input" />
              </template>
              <template v-else>
                <input type="file" accept=".cer" @change="e => tx.signatureFields.cer_file = e.target.files[0]" />
                <p v-if="tx.errors.cer_file" class="sp-error">{{ tx.errors.cer_file }}</p>
                <input type="file" accept=".key" @change="e => tx.signatureFields.key_file = e.target.files[0]" />
                <p v-if="tx.errors.key_file" class="sp-error">{{ tx.errors.key_file }}</p>
                <input v-model="tx.signatureFields.password" type="password" :placeholder="labels.contrasena" class="sp-input" />
                <p v-if="tx.errors.password" class="sp-error">{{ tx.errors.password }}</p>
              </template>
            </template>
            <template v-else-if="tx.signatureBackend.value === 'manual'">
              <input v-model="tx.signatureFields.scanned_image_path" placeholder="Ruta del escaneo" class="sp-input" />
              <input v-model="tx.signatureFields.witness_name" placeholder="Nombre del testigo" class="sp-input" />
            </template>
          </fieldset>

          <div class="sp-dialog__errors" aria-live="polite">
            <p v-if="tx.error.value" class="sp-error">{{ errorText }}</p>
          </div>

          <div class="sp-actions">
            <button type="button" class="sp-btn sp-btn--ghost" @click="visible = false">{{ labels.cancelar }}</button>
            <button type="submit" class="sp-btn sp-btn--primary" :disabled="tx.loading.value">
              {{ tx.loading.value ? labels.enviando : labels.confirmar }}
            </button>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useTransition } from '../composables/useTransition.js'
import { useSpLabels } from '../composables/useSpLabels.js'
import StateBadge from './StateBadge.vue'

const labels = useSpLabels()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  client: { type: Object, required: true },
  currentState: { type: String, default: '' },
  estados: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'transitioned'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const dialogRef = ref(null)
let previousFocus = null

const tx = useTransition(props.client)

const errorText = computed(() => {
  const e = tx.error.value
  if (!e) return ''
  if (typeof e === 'string') return e
  return e.detail || JSON.stringify(e)
})

function focusableElements(root) {
  if (!root) return []
  return Array.from(root.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  )).filter((el) => !el.disabled && el.offsetParent !== null)
}

function onKeydown(event) {
  if (event.key !== 'Tab') return
  const elements = focusableElements(dialogRef.value?.$el)
  if (elements.length === 0) return
  const first = elements[0]
  const last = elements[elements.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    previousFocus = document.activeElement
    await nextTick()
    const elements = focusableElements(dialogRef.value?.$el)
    elements[0]?.focus()
  } else if (previousFocus) {
    previousFocus.focus()
    previousFocus = null
  }
})

async function onSubmit() {
  try {
    const result = await tx.submit()
    if (result === undefined) return // validation failed
    emit('transitioned', result)
    visible.value = false
  } catch {
    // error already captured in tx.error and shown via errorText; keep dialog open
  }
}

defineExpose({ tx, onSubmit })
</script>

<style scoped>
.sp-dialog { width: min(100vw - 24px, 560px); display: flex; flex-direction: column; border-radius: var(--sp-radius); overflow: hidden; }
.sp-dialog__head { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--sp-color-primary); color: var(--sp-color-on-primary); font-weight: 700; }
.sp-dialog__current { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: var(--sp-surface-alt); border-bottom: 1px solid var(--sp-border); }
.sp-dialog__label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--sp-text-muted); }
.sp-form { display: flex; flex-direction: column; gap: 12px; }
.sp-field { display: flex; flex-direction: column; gap: 4px; }
.sp-sig { border: 1px solid var(--sp-border); border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.sp-sig legend { font-size: 12px; font-weight: 700; color: var(--sp-text); padding: 0 4px; }
.sp-actions { gap: 10px; }
</style>
