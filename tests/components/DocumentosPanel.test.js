import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import DocumentosPanel from '../../src/components/DocumentosPanel.vue'

function requisitoIdentificacion(opciones = [
  { id: 11, nombre: 'Pasaporte' },
  { id: 12, nombre: 'INE' },
]) {
  return {
    nivel: 'requisito_documento',
    tipo_documento: 'Identificación',
    tipo_documento_id: 7,
    porcentaje_requerido: 100,
    porcentaje_actual: 0,
    satisfecho: false,
    documentos_disponibles: opciones,
  }
}

function makeClient(overrides = {}) {
  return {
    listDocumentos: vi.fn().mockResolvedValue([
      { id: 1, documento: 4, tipo_documento: 'Acta', archivo: '/media/acta.pdf', porcentaje: 100 },
    ]),
    requisitos: vi.fn().mockResolvedValue([requisitoIdentificacion()]),
    uploadDocumento: vi.fn().mockResolvedValue({ id: 2 }),
    deleteDocumento: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

describe('DocumentosPanel', () => {
  it('lists uploaded documentos and loads requisitos on mount', async () => {
    const client = makeClient()
    const w = mount(DocumentosPanel, { props: { client } })
    await flushPromises()
    expect(client.listDocumentos).toHaveBeenCalled()
    expect(client.requisitos).toHaveBeenCalled()
    expect(w.text()).toContain('Acta')
    expect(w.text()).toContain('100%')
    expect(w.find('.sp-docs__link').attributes('href')).toBe('/media/acta.pdf')
  })

  it('renders the tipo select from requisitos and a dependent documento select', async () => {
    const client = makeClient()
    const w = mount(DocumentosPanel, { props: { client } })
    await flushPromises()
    // tipo auto-selected (single required tipo)
    expect(w.vm.selectedTipoId).toBe(7)
    await nextTick()
    // documento options come from documentos_disponibles
    const docOptions = w.findAll('select')[1].findAll('option').map((o) => o.text())
    expect(docOptions).toContain('Pasaporte')
    expect(docOptions).toContain('INE')
  })

  it('uploads with the chosen documento PK (no porcentaje), resets, refreshes, emits changed', async () => {
    const client = makeClient()
    const w = mount(DocumentosPanel, { props: { client } })
    await flushPromises()

    w.vm.documentoId = 12
    w.vm.file = new Blob(['pdf'])
    await w.vm.onSubmit()

    expect(client.uploadDocumento).toHaveBeenCalledWith({
      archivo: expect.any(Blob),
      documento: 12,
    })
    expect(client.listDocumentos).toHaveBeenCalledTimes(2) // mount + after upload
    expect(w.emitted('changed')).toBeTruthy()
    expect(w.vm.documentoId).toBeNull()
  })

  it('auto-selects the only documento option when a tipo has one', async () => {
    const client = makeClient({
      requisitos: vi.fn().mockResolvedValue([
        requisitoIdentificacion([{ id: 99, nombre: 'CURP' }]),
      ]),
    })
    const w = mount(DocumentosPanel, { props: { client } })
    await flushPromises()
    await nextTick()
    expect(w.vm.documentoId).toBe(99)
  })

  it('surfaces field errors from the backend', async () => {
    const client = makeClient({
      uploadDocumento: vi.fn().mockRejectedValue({ response: { data: { documento: ['Inexistente.'] } } }),
    })
    const w = mount(DocumentosPanel, { props: { client } })
    await flushPromises()
    w.vm.documentoId = 12
    w.vm.file = new Blob(['pdf'])
    await w.vm.onSubmit()
    expect(w.text()).toContain('Inexistente.')
  })

  it('shows a hint when the state requires no documents', async () => {
    const client = makeClient({ requisitos: vi.fn().mockResolvedValue([]) })
    const w = mount(DocumentosPanel, { props: { client } })
    await flushPromises()
    expect(w.text()).toContain('Este estado no exige documentos.')
    expect(w.find('form').exists()).toBe(false)
  })

  it('deletes a documento and emits changed', async () => {
    const client = makeClient()
    const w = mount(DocumentosPanel, { props: { client } })
    await flushPromises()
    await w.vm.onDelete(1)
    expect(client.deleteDocumento).toHaveBeenCalledWith(1)
    expect(w.emitted('changed')).toBeTruthy()
  })
})
