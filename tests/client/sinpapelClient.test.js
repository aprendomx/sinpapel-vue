import { describe, it, expect, vi } from 'vitest'
import { createSinpapelClient, buildTransitionRequest } from '../../src/client/sinpapelClient.js'

function mockAxios() {
  return {
    get: vi.fn().mockResolvedValue({ data: 'GET_OK' }),
    post: vi.fn().mockResolvedValue({ data: 'POST_OK' }),
    patch: vi.fn().mockResolvedValue({ data: 'PATCH_OK' }),
  }
}

describe('createSinpapelClient', () => {
  it('requires axios and resource', () => {
    expect(() => createSinpapelClient({ resource: 'x' })).toThrow(/axios/)
    expect(() => createSinpapelClient({ axios: {} })).toThrow(/resource/)
  })

  it('builds available-transitions URL', async () => {
    const axios = mockAxios()
    const c = createSinpapelClient({ axios, resource: 'solicitudes', pk: 42 })
    const r = await c.availableTransitions()
    expect(axios.get).toHaveBeenCalledWith('/sinpapel/api/solicitudes/42/available-transitions/')
    expect(r).toBe('GET_OK')
  })

  it('passes pagination params to history', async () => {
    const axios = mockAxios()
    const c = createSinpapelClient({ axios, resource: 'docs', pk: 7 })
    await c.history({ page: 3, pageSize: 50 })
    expect(axios.get).toHaveBeenCalledWith('/sinpapel/api/docs/7/history/', { params: { page: 3, page_size: 50 } })
  })

  it('honors custom basePath and mutable pk', async () => {
    const axios = mockAxios()
    const c = createSinpapelClient({ axios, basePath: '/api/wf/', resource: 'r', pk: 1 })
    c.pk = 99
    await c.previewTransition('APROBADA')
    expect(axios.post).toHaveBeenCalledWith('/api/wf/r/99/preview-transition/', { target_state: 'APROBADA' })
  })

  it('patches metadatos with raw values', async () => {
    const axios = mockAxios()
    const c = createSinpapelClient({ axios, resource: 'r', pk: 1 })
    await c.patchMetadatos({ monto: 10 })
    expect(axios.patch).toHaveBeenCalledWith('/sinpapel/api/r/1/metadatos/', { monto: 10 })
  })

  it('sends unsigned transition as JSON', async () => {
    const { body, config } = buildTransitionRequest({ target_state: 'X', comentarios: 'hi' })
    expect(body).toEqual({ target_state: 'X', comentarios: 'hi' })
    expect(config).toEqual({})
  })

  it('sends fiel server-side transition as multipart', () => {
    const cer = new Blob(['cer']); const key = new Blob(['key'])
    const { body, config } = buildTransitionRequest({
      target_state: 'X',
      signature: { backend: 'fiel', mode: 'server-side', cer_file: cer, key_file: key, password: 'pw' },
    })
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('target_state')).toBe('X')
    expect(body.get('signature.password')).toBe('pw')
    expect(config.headers['Content-Type']).toBe('multipart/form-data')
  })
})
