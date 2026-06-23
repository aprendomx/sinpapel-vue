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
    expect(axios.get).toHaveBeenCalledWith(
      '/sinpapel/api/solicitudes/1/available-transitions/',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(axios.get).toHaveBeenCalledWith(
      '/sinpapel/api/solicitudes/1/history/',
      expect.objectContaining({ params: { page: 1 }, signal: expect.any(AbortSignal) }),
    )
  })

  it('hides the SLA tab unless canEvaluateSla', async () => {
    const axios = mockAxios()
    const w = mount(SeguimientoPanel, { props: { axios, resource: 'r', pk: 1 } })
    await flushPromises()
    expect(w.text()).not.toContain('SLA')
  })

  it('passes api color to StateBadge when available', async () => {
    const axios = mockAxios()
    const w = mount(SeguimientoPanel, {
      props: { axios, resource: 'solicitudes', pk: 1, currentState: 'APROBADA' },
    })
    await flushPromises()
    const badge = w.findComponent({ name: 'StateBadge' })
    expect(badge.props('color')).toBe('#0a0')
  })

  it('uses english labels when locale is en', async () => {
    const axios = mockAxios()
    const w = mount(SeguimientoPanel, {
      props: { axios, resource: 'solicitudes', pk: 1, locale: 'en' },
    })
    await flushPromises()
    expect(w.text()).toContain('Change state')
    expect(w.text()).toContain('History')
  })
})
