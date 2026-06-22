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
    expect(axios.post).toHaveBeenCalledWith('/sinpapel/api/r/1/transition/', { target_state: 'X' }, {})
    expect(axios.get).toHaveBeenCalledTimes(2) // estados + historial refresh
  })
})
