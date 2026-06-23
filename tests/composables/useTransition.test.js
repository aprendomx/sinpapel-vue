import { describe, it, expect, vi } from 'vitest'
import { buildSignaturePayload, useTransition } from '../../src/composables/useTransition.js'

describe('buildSignaturePayload', () => {
  it('returns null when no backend chosen', () => {
    expect(buildSignaturePayload(null, 'client-side', {})).toBeNull()
  })
  it('shapes fiel client-side', () => {
    const f = { firma_b64: 'F', certificado_cer_b64: 'C' }
    expect(buildSignaturePayload('fiel', 'client-side', f))
      .toEqual({ backend: 'fiel', mode: 'client-side', firma_b64: 'F', certificado_cer_b64: 'C' })
  })
  it('shapes fiel server-side', () => {
    const f = { cer_file: 'cer', key_file: 'key', password: 'pw' }
    expect(buildSignaturePayload('fiel', 'server-side', f))
      .toEqual({ backend: 'fiel', mode: 'server-side', cer_file: 'cer', key_file: 'key', password: 'pw' })
  })
  it('shapes manual', () => {
    const f = { scanned_image_path: '/s.png', witness_name: 'Ana' }
    expect(buildSignaturePayload('manual', 'client-side', f))
      .toEqual({ backend: 'manual', scanned_image_path: '/s.png', witness_name: 'Ana' })
  })
  it('shapes fake', () => {
    expect(buildSignaturePayload('fake', 'client-side', {})).toEqual({ backend: 'fake' })
  })
})

describe('useTransition', () => {
  it('builds an unsigned payload, omitting empty optionals', () => {
    const t = useTransition({ transition: vi.fn() })
    t.targetState.value = 'APROBADA'
    expect(t.buildPayload()).toEqual({ target_state: 'APROBADA' })
  })
  it('includes optionals and signature when set', () => {
    const t = useTransition({ transition: vi.fn() })
    t.targetState.value = 'APROBADA'
    t.comentarios.value = 'ok'
    t.montoAprobado.value = 1000
    t.signatureBackend.value = 'fake'
    expect(t.buildPayload()).toEqual({
      target_state: 'APROBADA', comentarios: 'ok', monto_aprobado: 1000, signature: { backend: 'fake' },
    })
  })
  it('submit calls client.transition and captures error body', async () => {
    const client = { transition: vi.fn().mockRejectedValue({ response: { data: { detail: 'nope' } } }) }
    const t = useTransition(client)
    t.targetState.value = 'X'
    await expect(t.submit()).rejects.toBeTruthy()
    expect(t.error.value).toEqual({ detail: 'nope' })
    expect(t.loading.value).toBe(false)
  })

  it('resets all fields after successful submit', async () => {
    const client = { transition: vi.fn().mockResolvedValue({ success: true }) }
    const t = useTransition(client)
    t.targetState.value = 'APROBADA'
    t.comentarios.value = 'ok'
    t.montoAprobado.value = 1000
    t.condiciones.value = 'cond'
    t.signatureBackend.value = 'fake'
    await t.submit()
    expect(t.targetState.value).toBeNull()
    expect(t.comentarios.value).toBe('')
    expect(t.montoAprobado.value).toBeNull()
    expect(t.condiciones.value).toBe('')
    expect(t.signatureBackend.value).toBeNull()
    expect(t.signatureFields.firma_b64).toBe('')
  })

  it('validate requires targetState', () => {
    const t = useTransition({ transition: vi.fn() })
    expect(t.validate()).toBe(false)
    expect(t.errors.targetState).toBeTruthy()
  })

  it('validate requires fiel server-side fields', () => {
    const t = useTransition({ transition: vi.fn() })
    t.targetState.value = 'X'
    t.signatureBackend.value = 'fiel'
    t.signatureMode.value = 'server-side'
    expect(t.validate()).toBe(false)
    expect(t.errors.cer_file).toBeTruthy()
    expect(t.errors.key_file).toBeTruthy()
    expect(t.errors.password).toBeTruthy()
  })

  it('validate rejects non-positive montoAprobado', () => {
    const t = useTransition({ transition: vi.fn() })
    t.targetState.value = 'X'
    t.montoAprobado.value = 0
    expect(t.validate()).toBe(false)
    expect(t.errors.montoAprobado).toBeTruthy()
  })

  it('validate passes when all required fields are valid', () => {
    const t = useTransition({ transition: vi.fn() })
    t.targetState.value = 'X'
    t.montoAprobado.value = 100
    expect(t.validate()).toBe(true)
    expect(Object.keys(t.errors).length).toBe(0)
  })
})
