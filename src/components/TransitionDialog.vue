<template>
  <q-dialog v-model="visible" persistent>
    <q-card class="sp-dialog">
      <div class="sp-dialog__head">
        <q-icon name="swap_horiz" size="18px" />
        <span>Cambiar estado</span>
        <q-space />
        <q-btn icon="close" flat round dense size="sm" @click="visible = false" />
      </div>

      <div class="sp-dialog__current">
        <span class="sp-dialog__label">Estado actual</span>
        <state-badge :estado="currentState" />
      </div>

      <q-card-section>
        <q-form @submit="onSubmit" class="sp-form">
          <div class="sp-field">
            <label class="sp-label">Nuevo estado *</label>
            <select v-model="tx.targetState.value" class="sp-select">
              <option :value="null" disabled>Selecciona…</option>
              <option v-for="e in estados" :key="e.id ?? e.nombre" :value="e.nombre">
                {{ (e.nombre || '').replace(/_/g, ' ') }}
              </option>
            </select>
          </div>

          <div class="sp-field">
            <label class="sp-label">Comentarios</label>
            <textarea v-model="tx.comentarios.value" rows="3" class="sp-input"></textarea>
          </div>

          <div class="sp-field">
            <label class="sp-label">Monto aprobado (opcional)</label>
            <input v-model.number="tx.montoAprobado.value" type="number" class="sp-input" />
          </div>

          <div class="sp-field">
            <label class="sp-label">Condiciones (opcional)</label>
            <textarea v-model="tx.condiciones.value" rows="2" class="sp-input"></textarea>
          </div>

          <!-- Signature backend selector -->
          <fieldset class="sp-sig">
            <legend>Firma</legend>
            <select v-model="tx.signatureBackend.value" class="sp-select">
              <option :value="null">Sin firma</option>
              <option value="fiel">FIEL (e.firma SAT)</option>
              <option value="manual">Manual (escaneo + testigo)</option>
              <option value="fake">Fake (pruebas)</option>
            </select>

            <template v-if="tx.signatureBackend.value === 'fiel'">
              <select v-model="tx.signatureMode.value" class="sp-select">
                <option value="client-side">Cliente (firma_b64)</option>
                <option value="server-side">Servidor (.cer/.key)</option>
              </select>
              <template v-if="tx.signatureMode.value === 'client-side'">
                <input v-model="tx.signatureFields.firma_b64" placeholder="firma_b64" class="sp-input" />
                <input v-model="tx.signatureFields.certificado_cer_b64" placeholder="certificado_cer_b64" class="sp-input" />
              </template>
              <template v-else>
                <input type="file" accept=".cer" @change="e => tx.signatureFields.cer_file = e.target.files[0]" />
                <input type="file" accept=".key" @change="e => tx.signatureFields.key_file = e.target.files[0]" />
                <input v-model="tx.signatureFields.password" type="password" placeholder="Contraseña e.firma" class="sp-input" />
              </template>
            </template>
            <template v-else-if="tx.signatureBackend.value === 'manual'">
              <input v-model="tx.signatureFields.scanned_image_path" placeholder="Ruta del escaneo" class="sp-input" />
              <input v-model="tx.signatureFields.witness_name" placeholder="Nombre del testigo" class="sp-input" />
            </template>
          </fieldset>

          <p v-if="tx.error.value" class="sp-error">{{ errorText }}</p>

          <div class="sp-actions">
            <button type="button" class="sp-btn sp-btn--ghost" @click="visible = false">Cancelar</button>
            <button type="submit" class="sp-btn sp-btn--primary" :disabled="tx.loading.value">
              {{ tx.loading.value ? 'Enviando…' : 'Confirmar' }}
            </button>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useTransition } from '../composables/useTransition.js'
import StateBadge from './StateBadge.vue'

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

const tx = useTransition(props.client)

const errorText = computed(() => {
  const e = tx.error.value
  if (!e) return ''
  if (typeof e === 'string') return e
  return e.detail || JSON.stringify(e)
})

async function onSubmit() {
  if (!tx.targetState.value) return
  const result = await tx.submit()
  emit('transitioned', result)
  visible.value = false
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
.sp-label { font-size: 12px; font-weight: 600; color: var(--sp-text); }
.sp-input, .sp-select { padding: 7px 10px; border: 1px solid var(--sp-border); border-radius: 6px; font: inherit; color: var(--sp-text); background: var(--sp-surface); }
.sp-sig { border: 1px solid var(--sp-border); border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.sp-sig legend { font-size: 12px; font-weight: 700; color: var(--sp-text); padding: 0 4px; }
.sp-error { color: var(--sp-danger); font-size: 12px; margin: 0; }
.sp-actions { display: flex; justify-content: flex-end; gap: 10px; }
.sp-btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font: inherit; font-weight: 600; }
.sp-btn--ghost { background: transparent; color: var(--sp-text-muted); border: 1px solid var(--sp-border); }
.sp-btn--primary { background: var(--sp-color-primary); color: var(--sp-color-on-primary); }
.sp-btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
