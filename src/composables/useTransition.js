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
  const errors = reactive({})

  const signaturePayload = computed(() =>
    buildSignaturePayload(signatureBackend.value, signatureMode.value, signatureFields),
  )

  function buildPayload() {
    const payload = { target_state: targetState.value }
    if (comentarios.value) payload.comentarios = comentarios.value
    if (condiciones.value) payload.condiciones = condiciones.value
    const sig = signaturePayload.value
    if (sig) payload.signature = sig
    return payload
  }

  function validate() {
    Object.keys(errors).forEach((k) => delete errors[k])
    let ok = true
    if (!targetState.value) {
      errors.targetState = 'Selecciona un estado destino.'
      ok = false
    }
    if (signatureBackend.value === 'fiel' && signatureMode.value === 'server-side') {
      if (!signatureFields.cer_file) { errors.cer_file = 'Selecciona el archivo .cer.'; ok = false }
      if (!signatureFields.key_file) { errors.key_file = 'Selecciona el archivo .key.'; ok = false }
      if (!signatureFields.password) { errors.password = 'Ingresa la contraseña.'; ok = false }
    }
    return ok
  }

  function reset() {
    targetState.value = null
    comentarios.value = ''
    condiciones.value = ''
    signatureBackend.value = null
    signatureMode.value = 'client-side'
    signatureFields.firma_b64 = ''
    signatureFields.certificado_cer_b64 = ''
    signatureFields.cer_file = null
    signatureFields.key_file = null
    signatureFields.password = ''
    signatureFields.scanned_image_path = ''
    signatureFields.witness_name = ''
    error.value = null
    Object.keys(errors).forEach((k) => delete errors[k])
  }

  async function submit() {
    if (!validate()) return
    loading.value = true
    error.value = null
    try {
      const result = await client.transition(buildPayload())
      reset()
      return result
    } catch (e) {
      error.value = e.response?.data ?? { detail: e.message }
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    targetState, comentarios, condiciones,
    signatureBackend, signatureMode, signatureFields, signaturePayload,
    loading, error, errors, buildPayload, submit, reset, validate,
  }
}
