// The search panel, opened over the workbench the way it opens over a screen:
// the real openSearch(), with the network answering from a recorded search,
// in each of the states the panel has.
import type { Meta, StoryObj } from '@storybook/html'
import { t } from '../../src/shared/i18n.ts'
import { h, icon } from '../../src/main/ui/dom.ts'
import { closeSearch, openSearch } from '../../src/main/ui/search.ts'
import { makeCtx } from '../lib/stub.ts'

const meta = {
  title: 'Search',
  render: () => opener('한강'),
} satisfies Meta

export default meta
type Story = StoryObj

/**
 * A page with one button on it, and the panel already open over it.
 *
 * The panel is put away first: stories share one iframe, and the previous
 * story's panel would otherwise still be up when this one asks for its own.
 */
function opener(query: string): HTMLElement {
  const ctx = makeCtx()
  closeSearch()
  setTimeout(() => openSearch(ctx, query))
  return h(
    'div',
    null,
    h('h2', null, t('탐색')),
    h('button', { class: 'btn', 'data-nav': '', onclick: () => openSearch(ctx, query) }, icon('search', 16), t('검색')),
    h('div', { class: 'sub', style: 'margin-top: 12px' }, '닫은 뒤 이 버튼으로 다시 엽니다. 행을 고르면 재생하고 닫힙니다.'),
  )
}

export const Answers: Story = { name: '답이 있는 상태' }

export const Empty: Story = {
  name: '비어 있는 상태',
  render: () => opener(''),
}

export const Nothing: Story = {
  name: '결과 없음',
  render: () => opener('결과 없음'),
}

export const Phone: Story = {
  name: '폰 너비',
  parameters: { viewport: { defaultViewport: 'phone' } },
}
