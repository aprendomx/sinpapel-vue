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

  it('shows pagination controls when count exceeds page', () => {
    const w = mount(HistoryTimeline, {
      props: { entries: entries.slice(0, 1), page: 1, pageSize: 1, count: 2 },
    })
    expect(w.find('.sp-tl-pager').exists()).toBe(true)
    expect(w.text()).toContain('Página 1 de 2')
    expect(w.find('button.sp-tl-pager__prev').attributes('disabled')).toBeDefined()
    expect(w.find('button.sp-tl-pager__next').attributes('disabled')).toBeUndefined()
  })

  it('emits prev and next on button click', async () => {
    const w = mount(HistoryTimeline, {
      props: { entries, page: 2, pageSize: 2, count: 5 },
    })
    await w.find('button.sp-tl-pager__prev').trigger('click')
    await w.find('button.sp-tl-pager__next').trigger('click')
    expect(w.emitted('prev')).toHaveLength(1)
    expect(w.emitted('next')).toHaveLength(1)
  })
})
