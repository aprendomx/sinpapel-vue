import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SlaStatusPanel from '../../src/components/SlaStatusPanel.vue'

describe('SlaStatusPanel', () => {
  it('evaluates SLA and lists actions', async () => {
    const client = { slaStatus: vi.fn().mockResolvedValue([{ accion: 'alertar', estado: 'EN_REVISION' }]) }
    const w = mount(SlaStatusPanel, { props: { client } })
    await w.vm.evaluate()
    expect(client.slaStatus).toHaveBeenCalled()
    expect(w.text()).toContain('alertar')
  })

  it('shows an up-to-date state when no actions', async () => {
    const client = { slaStatus: vi.fn().mockResolvedValue([]) }
    const w = mount(SlaStatusPanel, { props: { client } })
    await w.vm.evaluate()
    expect(w.text()).toContain('Sin acciones')
  })
})
