import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSeguimientoStore } from '../../src/stores/useSeguimientoStore.js'

function mockAxios() {
  return {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    patch: vi.fn(),
  }
}

function mockAxiosWithSignal() {
  return {
    get: vi.fn((url, config) => {
      return new Promise((resolve, reject) => {
        if (config?.signal?.aborted) {
          const err = new Error('canceled')
          err.name = 'CanceledError'
          err.code = 'ERR_CANCELED'
          reject(err)
          return
        }
        const handler = () => {
          const err = new Error('canceled')
          err.name = 'CanceledError'
          err.code = 'ERR_CANCELED'
          reject(err)
        }
        config?.signal?.addEventListener('abort', handler, { once: true })
      })
    }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    patch: vi.fn(),
  }
}

describe('useSeguimientoStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('loads estados via the client', async () => {
    const axios = mockAxios()
    axios.get.mockResolvedValueOnce({ data: [{ id: 1, nombre: 'APROBADA', color: '#0a0' }] })
    const store = useSeguimientoStore({ axios, resource: 'solicitudes', pk: 5 })
    await store.cargarEstados()
    expect(store.estados).toEqual([{ id: 1, nombre: 'APROBADA', color: '#0a0' }])
  })

  it('stores paginated history', async () => {
    const axios = mockAxios()
    axios.get.mockResolvedValueOnce({ data: { count: 2, results: [{ history_id: 1 }, { history_id: 2 }] } })
    const store = useSeguimientoStore({ axios, resource: 'r', pk: 1 })
    await store.cargarHistorial()
    expect(store.historialCount).toBe(2)
    expect(store.historial).toHaveLength(2)
  })

  it('ejecutarTransicion refreshes estados + historial', async () => {
    const axios = mockAxios()
    axios.get.mockResolvedValue({ data: [] })
    const store = useSeguimientoStore({ axios, resource: 'r', pk: 1 })
    await store.ejecutarTransicion({ target_state: 'X' })
    expect(axios.post).toHaveBeenCalledWith(
      '/sinpapel/api/r/1/transition/',
      { target_state: 'X' },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(axios.get).toHaveBeenCalledTimes(2) // estados + historial refresh
  })

  it('exposes cancel() and aborts in-flight request without setting error', async () => {
    const axios = mockAxiosWithSignal()
    const store = useSeguimientoStore({ axios, resource: 'r', pk: 1 })

    expect(store.cancel).toBeTypeOf('function')

    const promise = store.cargarEstados()
    store.cancel()

    await expect(promise).rejects.toMatchObject({ code: 'ERR_CANCELED' })
    expect(store.error).toBeNull()
  })

  it('tracks granular loading per action', async () => {
    const axios = mockAxios()
    axios.get.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ data: [] }), 10)))
    const store = useSeguimientoStore({ axios, resource: 'r', pk: 1 })

    const promise = store.cargarEstados()
    expect(store.loading.estados).toBe(true)
    expect(store.loading.historial).toBe(false)
    expect(store.loading.transicion).toBe(false)
    expect(store.loading.metadatos).toBe(false)
    await promise
    expect(store.loading.estados).toBe(false)

    const promise2 = store.cargarHistorial()
    expect(store.loading.historial).toBe(true)
    await promise2
    expect(store.loading.historial).toBe(false)
  })

  it('passes signal to client on every async action', async () => {
    const axios = mockAxios()
    axios.get.mockResolvedValue({ data: [] })
    axios.patch.mockResolvedValue({ data: {} })
    const store = useSeguimientoStore({ axios, resource: 'r', pk: 1 })

    await store.cargarEstados()
    expect(axios.get).toHaveBeenLastCalledWith(
      '/sinpapel/api/r/1/available-transitions/',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )

    await store.cargarHistorial()
    expect(axios.get).toHaveBeenLastCalledWith(
      '/sinpapel/api/r/1/history/',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )

    await store.cargarMetadatos()
    expect(axios.get).toHaveBeenLastCalledWith(
      '/sinpapel/api/r/1/metadatos/',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )

    await store.guardarMetadatos({})
    expect(axios.patch).toHaveBeenLastCalledWith(
      '/sinpapel/api/r/1/metadatos/',
      {},
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )

    await store.cargarPreview('X')
    expect(axios.post).toHaveBeenLastCalledWith(
      '/sinpapel/api/r/1/preview-transition/',
      { target_state: 'X' },
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )

    await store.evaluarSla()
    expect(axios.post).toHaveBeenLastCalledWith(
      '/sinpapel/api/r/1/sla-status/',
      null,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })
})
