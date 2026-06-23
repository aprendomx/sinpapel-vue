import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import SeguimientoPanel from '../../src/components/SeguimientoPanel.vue'

function mockAxios() {
  return {
    get: vi.fn((url) =>
      url.includes('available-transitions')
        ? Promise.resolve({ data: [{ id: 1, nombre: 'APROBADA', color: '#0a0' }] })
        : Promise.resolve({ data: { count: 0, results: [] } }),
    ),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    patch: vi.fn(),
  }
}

describe('SeguimientoPanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('loads estados + historial on mount', async () => {
    const axios = mockAxios()
    mount(SeguimientoPanel, { props: { axios, resource: 'solicitudes', pk: 1 } })
    await flushPromises()
    expect(axios.get).toHaveBeenCalledWith('/sinpapel/api/solicitudes/1/available-transitions/')
    expect(axios.get).toHaveBeenCalledWith('/sinpapel/api/solicitudes/1/history/', { params: { page: 1 } })
  })

  it('hides the SLA tab unless canEvaluateSla', async () => {
    const axios = mockAxios()
    const w = mount(SeguimientoPanel, { props: { axios, resource: 'r', pk: 1 } })
    await flushPromises()
    expect(w.text()).not.toContain('SLA')
  })
})
