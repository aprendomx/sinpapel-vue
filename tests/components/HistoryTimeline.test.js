import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HistoryTimeline from '../../src/components/HistoryTimeline.vue'

const entries = [
  { history_id: 2, history_type: '~', history_date: '2026-06-19T10:00:00Z', history_user: 'ana', history_change_reason: 'APROBADA' },
  { history_id: 1, history_type: '+', history_date: '2026-06-18T09:00:00Z', history_user: null, history_change_reason: null },
]

describe('HistoryTimeline', () => {
  it('renders one row per entry', () => {
    const w = mount(HistoryTimeline, { props: { entries } })
    expect(w.findAll('.sp-tl-entry')).toHaveLength(2)
  })
  it('falls back to "Sistema" when history_user is null', () => {
    const w = mount(HistoryTimeline, { props: { entries } })
    expect(w.text()).toContain('Sistema')
  })
  it('shows an empty state for no entries', () => {
    const w = mount(HistoryTimeline, { props: { entries: [] } })
    expect(w.find('.sp-tl-empty').exists()).toBe(true)
  })
})
