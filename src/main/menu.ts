// The menu: what the sidebar and the phone's drawer offer, in what order, and
// which lines are on.
//
// The order is a television's, because that is the menu the owner set it
// beside (2026-09-05): 홈, 아동, 스포츠, 생방송, 게임, 뉴스, 채널, 구독, 시청 기록,
// 재생목록, 내 동영상, then 설정. Two things differ. 음악 is first, because this
// is a music player before it is anything else. And 쇼츠 is not here: there is
// no feed for it to draw from (FEshorts answers 400 to the page's client and to
// the television's, and the TV guide lists no such destination), and Shorts is
// the one part of YouTube this product was built to leave behind.
//
// Every line but 음악 can be turned off in the settings sheet, and most of the
// television's are off to begin with. The default is the owner's choice of a
// small menu; the rest is there for whoever wants it. What the reader chooses
// is written down per line (store.ts), so a line added here later arrives at
// its own default rather than at whatever a saved list happened to hold.

import type { View } from './ui/ctx.ts'
import { menuChoices, setMenuChoice } from './store.ts'

/** The stable name a line is saved under. Never renamed once shipped. */
export type MenuKey =
  | 'music'
  | 'home'
  | 'kids'
  | 'sports'
  | 'live'
  | 'gaming'
  | 'news'
  | 'learning'
  | 'channels'
  | 'subs'
  | 'history'
  | 'queue'
  | 'playlists'
  | 'myvideos'

export interface MenuLine {
  key: MenuKey
  view: View
  /** A Korean key, translated where the line is drawn. */
  label: string
  icon: string
  /** On until the reader says otherwise. */
  byDefault: boolean
  /** Cannot be turned off. */
  fixed?: boolean
  /** Opens a section heading above it in the column. A Korean key. */
  section?: string
}

/**
 * The television's genre feeds, by the browse id the television asks for.
 *
 * These ids answer only to the TV client (innertube.ts); the same ids from a
 * WEB context are 400. Measured signed out on 2026-09-05, all six with content.
 */
export const TOPIC_FEEDS = {
  sports: 'FEtopics_sports',
  live: 'FEtopics_live',
  gaming: 'FEtopics_gaming',
  news: 'FEtopics_news',
} as const

/** The learning destination, which the desktop client answers with lockups. */
export const LEARNING_FEED = 'FEcourses_destination'

/** The kids screen has no feed of its own; its id names the curated screen in api.ts. */
export const KIDS = 'kids'

export const MENU: readonly MenuLine[] = [
  { key: 'music', view: { kind: 'explore' }, label: '음악', icon: 'radio', byDefault: true, fixed: true },
  { key: 'home', view: { kind: 'home' }, label: '홈', icon: 'home', byDefault: true },
  { key: 'kids', view: { kind: 'topic', id: KIDS, title: '아동' }, label: '아동', icon: 'kids', byDefault: false },
  { key: 'sports', view: { kind: 'topic', id: TOPIC_FEEDS.sports, title: '스포츠' }, label: '스포츠', icon: 'sports', byDefault: false },
  { key: 'live', view: { kind: 'topic', id: TOPIC_FEEDS.live, title: '생방송' }, label: '생방송', icon: 'live', byDefault: false },
  { key: 'gaming', view: { kind: 'topic', id: TOPIC_FEEDS.gaming, title: '게임' }, label: '게임', icon: 'gaming', byDefault: false },
  { key: 'news', view: { kind: 'topic', id: TOPIC_FEEDS.news, title: '뉴스' }, label: '뉴스', icon: 'news', byDefault: false },
  { key: 'learning', view: { kind: 'topic', id: LEARNING_FEED, title: '학습' }, label: '학습', icon: 'learning', byDefault: false },
  { key: 'channels', view: { kind: 'channels' }, label: '채널', icon: 'channels', byDefault: true },
  { key: 'subs', view: { kind: 'subs' }, label: '구독', icon: 'subs', byDefault: true },
  { key: 'history', view: { kind: 'history' }, label: '시청 기록', icon: 'history', byDefault: true, section: '내 라이브러리' },
  // 대기열 above 재생목록, by the owner's word (2026-09-04): what is playing
  // next is reached for more often than what has been kept.
  { key: 'queue', view: { kind: 'queue' }, label: '대기열', icon: 'queue', byDefault: true },
  { key: 'playlists', view: { kind: 'playlists' }, label: '재생목록', icon: 'library', byDefault: true },
  { key: 'myvideos', view: { kind: 'myvideos' }, label: '내 동영상', icon: 'myvideos', byDefault: false },
]

/** Whether the line is on: the reader's choice if made, the default otherwise. */
export function menuOn(line: MenuLine): boolean {
  if (line.fixed) return true
  const chosen = menuChoices()[line.key]
  return chosen === undefined ? line.byDefault : chosen
}

export function setMenuOn(line: MenuLine, on: boolean): void {
  if (line.fixed) return
  setMenuChoice(line.key, on)
}

/** The lines that are on, in the menu's order. */
export function menuLines(): MenuLine[] {
  return MENU.filter(menuOn)
}

/** The title of a topic screen, from the view it was opened with. A Korean key. */
export function topicTitle(id: string): string {
  return MENU.find((line) => line.view.kind === 'topic' && line.view.id === id)?.label ?? id
}
