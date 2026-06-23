import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TransitionDialog from '../../src/components/TransitionDialog.vue'

const estados = [{ id: 1, nombre: 'APROBADA', color: '#0a0' }, { id: 2, nombre: 'RECHAZADA', color: '#a00' }]

describe('TransitionDialog', () => {
  it('submits the selected transition via the client', async () => {
    const client = { transition: vi.fn().mockResolvedValue({ success: true, estado_nuevo: 'APROBADA' }) }
    const w = mount(TransitionDialog, {
      props: { modelValue: true, client, currentState: 'EN_REVISION', estados },
    })
    w.vm.tx.targetState.value = 'APROBADA'
    await w.vm.onSubmit()
    expect(client.transition).toHaveBeenCalledWith({ target_state: 'APROBADA' })
    expect(w.emitted('transitioned')[0][0]).toEqual({ success: true, estado_nuevo: 'APROBADA' })
    expect(w.emitted('update:modelValue').at(-1)).toEqual([false])
  })

  it('does not submit without a target state', async () => {
    const client = { transition: vi.fn() }
    const w = mount(TransitionDialog, {
      props: { modelValue: true, client, currentState: 'X', estados },
    })
    await w.vm.onSubmit()
    expect(client.transition).not.toHaveBeenCalled()
  })
})
