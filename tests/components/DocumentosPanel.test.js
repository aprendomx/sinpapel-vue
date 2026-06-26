import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import DocumentosPanel from '../../src/components/DocumentosPanel.vue'

function makeClient(overrides = {}) {
  return {
    listDocumentos: vi.fn().mockResolvedValue([
      { id: 1, documento: 4, tipo_documento: 'Acta', archivo: '/media/acta.pdf', porcentaje: 100 },
    ]),
    uploadDocumento: vi.fn().mockResolvedValue({ id: 2 }),
    deleteDocumento: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

describe('DocumentosPanel', () => {
  it('lists uploaded documentos on mount', async () => {
    const client = makeClient()
    const w = mount(DocumentosPanel, { props: { client } })
    await flushPromises()
    expect(client.listDocumentos).toHaveBeenCalled()
    expect(w.text()).toContain('Acta')
    expect(w.text()).toContain('100%')
    expect(w.find('.sp-docs__link').attributes('href')).toBe('/media/acta.pdf')
  })

  it('uploads a file, resets form, refreshes list and emits changed', async () => {
    const client = makeClient()
    const w = mount(DocumentosPanel, { props: { client } })
    await flushPromises()

    w.vm.file = new Blob(['pdf'])
    w.vm.form.tipo_documento = 3
    w.vm.form.porcentaje = 90
    await w.vm.onSubmit()

    expect(client.uploadDocumento).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_documento: 3, porcentaje: 90 }),
    )
    expect(client.listDocumentos).toHaveBeenCalledTimes(2) // mount + after upload
    expect(w.emitted('changed')).toBeTruthy()
  })

  it('surfaces field errors from the backend', async () => {
    const client = makeClient({
      uploadDocumento: vi.fn().mockRejectedValue({ response: { data: { tipo_documento: ['Inexistente.'] } } }),
    })
    const w = mount(DocumentosPanel, { props: { client } })
    await flushPromises()
    w.vm.file = new Blob(['pdf'])
    await w.vm.onSubmit()
    expect(w.text()).toContain('Inexistente.')
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
