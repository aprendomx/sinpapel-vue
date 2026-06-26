import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import RequisitosPanel from '../../src/components/RequisitosPanel.vue'

describe('RequisitosPanel', () => {
  it('loads and renders requisitos with compliance marks', async () => {
    const client = {
      requisitos: vi.fn().mockResolvedValue([
        { nivel: 'estado', tipo_documento: 'Acta', porcentaje_requerido: 100, porcentaje_actual: 50, satisfecho: false, mensaje: 'Falta' },
        { nivel: 'estado', tipo_documento: 'INE', satisfecho: true },
      ]),
    }
    const w = mount(RequisitosPanel, { props: { client } })
    await flushPromises()
    expect(client.requisitos).toHaveBeenCalled()
    expect(w.text()).toContain('Acta')
    expect(w.text()).toContain('50% / 100%')
    expect(w.findAll('.sp-req__item.is-ok')).toHaveLength(1)
  })

  it('shows empty message when no requisitos', async () => {
    const client = { requisitos: vi.fn().mockResolvedValue([]) }
    const w = mount(RequisitosPanel, { props: { client } })
    await flushPromises()
    expect(w.text()).toContain('Sin requisitos')
  })
})
