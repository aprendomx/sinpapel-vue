import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MetadatosForm from '../../src/components/MetadatosForm.vue'

const schema = [
  { nombre: 'monto', tipo: 'int', requerido: true, default: null, choices: null, etiqueta: 'Monto', ayuda: '' },
  { nombre: 'tipo', tipo: 'str', requerido: false, default: 'A', choices: ['A', 'B'], etiqueta: 'Tipo', ayuda: 'Elige' },
]

describe('MetadatosForm', () => {
  it('renders a field per schema campo with current values', async () => {
    const client = {
      getMetadatos: vi.fn().mockResolvedValue({ schema, values: { monto: 500, tipo: 'B' } }),
      patchMetadatos: vi.fn(),
    }
    const w = mount(MetadatosForm, { props: { client } })
    await flushPromises()
    expect(w.findAll('.sp-meta-field')).toHaveLength(2)
    expect(w.find('input[name="monto"]').element.value).toBe('500')
  })

  it('patches edited values and emits saved', async () => {
    const client = {
      getMetadatos: vi.fn().mockResolvedValue({ schema, values: { monto: 1, tipo: 'A' } }),
      patchMetadatos: vi.fn().mockResolvedValue({ monto: 2, tipo: 'A' }),
    }
    const w = mount(MetadatosForm, { props: { client } })
    await flushPromises()
    w.vm.values.monto = 2
    await w.vm.onSubmit()
    expect(client.patchMetadatos).toHaveBeenCalledWith({ monto: 2, tipo: 'A' })
    expect(w.emitted('saved')[0][0]).toEqual({ monto: 2, tipo: 'A' })
  })
})
