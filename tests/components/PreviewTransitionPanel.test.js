import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PreviewTransitionPanel from '../../src/components/PreviewTransitionPanel.vue'

describe('PreviewTransitionPanel', () => {
  it('renders a blocked verdict with reasons', async () => {
    const client = { previewTransition: vi.fn().mockResolvedValue({
      permitido: false,
      razones_bloqueo: [{ tipo: 'predicado', detalle: 'monto excede' }],
      documentos_faltantes: [], predicados_fallidos: [], aprobadores_requeridos: [],
      side_effects: [], historial_reciente: [],
    }) }
    const w = mount(PreviewTransitionPanel, { props: { client, targetState: 'APROBADA' } })
    await flushPromises()
    expect(client.previewTransition).toHaveBeenCalledWith('APROBADA')
    expect(w.text()).toContain('Bloqueada')
    expect(w.text()).toContain('monto excede')
  })

  it('renders an allowed verdict', async () => {
    const client = { previewTransition: vi.fn().mockResolvedValue({
      permitido: true, razones_bloqueo: [], documentos_faltantes: [], predicados_fallidos: [],
      aprobadores_requeridos: [], side_effects: ['notificar'], historial_reciente: [],
    }) }
    const w = mount(PreviewTransitionPanel, { props: { client, targetState: 'X' } })
    await flushPromises()
    expect(w.text()).toContain('Permitida')
  })
})
