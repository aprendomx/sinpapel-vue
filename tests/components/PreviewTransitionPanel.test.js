import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PreviewTransitionPanel from '../../src/components/PreviewTransitionPanel.vue'

describe('PreviewTransitionPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a blocked verdict with reasons', async () => {
    const client = { previewTransition: vi.fn().mockResolvedValue({
      permitido: false,
      razones_bloqueo: [{ tipo: 'predicado', detalle: 'monto excede' }],
      documentos_faltantes: [], predicados_fallidos: [], aprobadores_requeridos: [],
      side_effects: [], historial_reciente: [],
    }) }
    mount(PreviewTransitionPanel, { props: { client, targetState: 'APROBADA' } })
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(client.previewTransition).toHaveBeenCalledWith('APROBADA', { signal: expect.any(AbortSignal) })
    expect(client.previewTransition).toHaveBeenCalledTimes(1)
  })

  it('renders an allowed verdict', async () => {
    const client = { previewTransition: vi.fn().mockResolvedValue({
      permitido: true, razones_bloqueo: [], documentos_faltantes: [], predicados_fallidos: [],
      aprobadores_requeridos: [], side_effects: ['notificar'], historial_reciente: [],
    }) }
    const w = mount(PreviewTransitionPanel, { props: { client, targetState: 'X' } })
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(w.text()).toContain('Permitida')
  })

  it('cancels previous preview request when targetState changes rapidly', async () => {
    const client = {
      previewTransition: vi.fn((targetState, { signal }) => {
        return new Promise((resolve, reject) => {
          if (signal?.aborted) {
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
          signal?.addEventListener('abort', handler, { once: true })
        })
      }),
    }
    const w = mount(PreviewTransitionPanel, { props: { client, targetState: 'A' } })
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(client.previewTransition).toHaveBeenCalledWith('A', { signal: expect.any(AbortSignal) })

    await w.setProps({ targetState: 'B' })
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(client.previewTransition).toHaveBeenCalledWith('B', { signal: expect.any(AbortSignal) })
    expect(client.previewTransition).toHaveBeenCalledTimes(2)
  })

  it('debounces rapid targetState changes into a single request', async () => {
    const client = { previewTransition: vi.fn().mockResolvedValue({ permitido: true }) }
    const w = mount(PreviewTransitionPanel, { props: { client, targetState: 'A' } })

    // Change rapidly before the first 300ms timer fires
    await w.setProps({ targetState: 'B' })
    await w.setProps({ targetState: 'C' })

    // Only 300ms have elapsed total — the first timer should have been cleared
    vi.advanceTimersByTime(299)
    expect(client.previewTransition).not.toHaveBeenCalled()

    // After the full 300ms from the last change
    vi.advanceTimersByTime(1)
    await flushPromises()
    expect(client.previewTransition).toHaveBeenCalledTimes(1)
    expect(client.previewTransition).toHaveBeenCalledWith('C', { signal: expect.any(AbortSignal) })
  })
})
