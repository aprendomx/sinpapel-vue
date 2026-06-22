import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StateBadge from '../../src/components/StateBadge.vue'

describe('StateBadge', () => {
  it('humanizes the estado name by default', () => {
    const w = mount(StateBadge, { props: { estado: 'EN_REVISION' } })
    expect(w.text()).toContain('EN REVISION')
  })
  it('prefers an explicit label', () => {
    const w = mount(StateBadge, { props: { estado: 'EN_REVISION', label: 'En revisión' } })
    expect(w.text()).toContain('En revisión')
  })
  it('applies the api color when provided', () => {
    const w = mount(StateBadge, { props: { estado: 'X', color: '#0a8f00' } })
    expect(w.attributes('style')).toContain('#0a8f00')
  })
})
