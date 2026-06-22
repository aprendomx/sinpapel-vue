import { ref, reactive, computed } from 'vue'

/** Pure: shape the `signature` block per backend×mode (mirrors SignatureRequestSerializer). */
export function buildSignaturePayload(backend, mode, f) {
  if (!backend) return null
  if (backend === 'fiel' && mode === 'server-side') {
    return { backend: 'fiel', mode: 'server-side', cer_file: f.cer_file, key_file: f.key_file, password: f.password }
  }
  if (backend === 'fiel') {
    return { backend: 'fiel', mode: 'client-side', firma_b64: f.firma_b64, certificado_cer_b64: f.certificado_cer_b64 }
  }
  if (backend === 'manual') {
    return { backend: 'manual', scanned_image_path: f.scanned_image_path, witness_name: f.witness_name }
  }
  if (backend === 'fake') return { backend: 'fake' }
  return null
}

export function useTransition(client) {
  const targetState = ref(null)
  const comentarios = ref('')
  const montoAprobado = ref(null)
  const condiciones = ref('')
  const signatureBackend = ref(null) // null | 'fiel' | 'manual' | 'fake'
  const signatureMode = ref('client-side')
  const signatureFields = reactive({
    firma_b64: '', certificado_cer_b64: '',
    cer_file: null, key_file: null, password: '',
    scanned_image_path: '', witness_name: '',
  })
  const loading = ref(false)
  const error = ref(null)

  const signaturePayload = computed(() =>
    buildSignaturePayload(signatureBackend.value, signatureMode.value, signatureFields),
  )

  function buildPayload() {
    const payload = { target_state: targetState.value }
    if (comentarios.value) payload.comentarios = comentarios.value
    if (montoAprobado.value != null && montoAprobado.value !== '') payload.monto_aprobado = montoAprobado.value
    if (condiciones.value) payload.condiciones = condiciones.value
    const sig = signaturePayload.value
    if (sig) payload.signature = sig
    return payload
  }

  async function submit() {
    loading.value = true
    error.value = null
    try {
      return await client.transition(buildPayload())
    } catch (e) {
      error.value = e.response?.data ?? { detail: e.message }
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    targetState, comentarios, montoAprobado, condiciones,
    signatureBackend, signatureMode, signatureFields, signaturePayload,
    loading, error, buildPayload, submit,
  }
}
