// The UI's words, keyed by the Korean.
//
// The key *is* the Korean string, so a call site reads as the sentence it
// renders and a missing translation falls back to something readable rather
// than to a bare identifier. Adding a language means adding a table in
// `lang/`, never touching a view.
//
// Which language: whatever the reader chose, else what YouTube itself is set
// to (its own `hl`), else the browser's. YouTube's own setting comes first
// because this UI stands in front of YouTube, and reading one language on the
// page and another over it is worse than either.

import { EN } from './lang/en.ts'
import { JA } from './lang/ja.ts'
import { ZH_CN } from './lang/zh-cn.ts'
import { ZH_TW } from './lang/zh-tw.ts'
import { ES } from './lang/es.ts'
import { PT_BR } from './lang/pt-br.ts'
import { FR } from './lang/fr.ts'
import { DE } from './lang/de.ts'
import { RU } from './lang/ru.ts'
import { VI } from './lang/vi.ts'
import { ID } from './lang/id.ts'
import { TH } from './lang/th.ts'
import { HI } from './lang/hi.ts'

/**
 * The languages this UI speaks.
 *
 * These are BCP-47 tags, so they can be handed to `Intl` as they are. Korean
 * has no table: it is what the keys already say.
 *
 * Right-to-left languages are deliberately absent. The layout has never been
 * checked mirrored, and a half-mirrored screen is worse than an English one.
 */
export type Lang = 'ko' | 'en' | 'ja' | 'zh-CN' | 'zh-TW' | 'es' | 'pt-BR' | 'fr' | 'de' | 'ru' | 'vi' | 'id' | 'th' | 'hi'

const TABLES: Record<Exclude<Lang, 'ko'>, Record<string, string>> = {
  en: EN,
  ja: JA,
  'zh-CN': ZH_CN,
  'zh-TW': ZH_TW,
  es: ES,
  'pt-BR': PT_BR,
  fr: FR,
  de: DE,
  ru: RU,
  vi: VI,
  id: ID,
  th: TH,
  hi: HI,
}

const ALL = ['ko', ...Object.keys(TABLES)] as Lang[]

function isLang(v: string | null): v is Lang {
  return v !== null && (ALL as string[]).includes(v)
}

/**
 * Reads a locale tag as one of ours.
 *
 * Matched on the prefix, because `hl` arrives in more shapes than it has
 * meanings: `en`, `en-GB`, `en_US`, `pt-PT`. Two of them need more than the
 * prefix:
 *
 * - **Chinese is chosen by script, not by country.** `zh-TW`, `zh-HK`,
 *   `zh-MO` and anything carrying `Hant` are the traditional table; every
 *   other `zh`, including bare `zh` and `zh-Hans-*`, is the simplified one.
 *   Matching `zh` on the prefix alone would hand Taiwan simplified characters.
 * - **Portuguese has one table here and it is the Brazilian one.** European
 *   Portuguese is close enough to read, and far closer than English is.
 *
 * Anything else with no table is English, which is the one language the rest
 * of the world is most likely to have in common with this UI.
 */
function fromTag(raw: string): Lang | undefined {
  const tag = raw.toLowerCase().replace(/_/g, '-')
  if (tag.startsWith('zh')) {
    const traditional = tag.includes('hant') || /-(tw|hk|mo)\b/.test(tag)
    return traditional ? 'zh-TW' : 'zh-CN'
  }
  if (tag.startsWith('pt')) return 'pt-BR'
  // `in` and `iw` are the codes Java and older browsers still emit for
  // Indonesian and Hebrew; only the first of those has a table here.
  if (tag.startsWith('in')) return 'id'
  const base = tag.split('-')[0] ?? ''
  return ALL.find((l) => l === base)
}

let lang: Lang = 'ko'

/** `hl` is YouTube's own interface language, read from the page's config. */
export function pickLang(chosen: string | null, youtubeHl: string | undefined): Lang {
  if (isLang(chosen)) return chosen
  return fromTag(youtubeHl ?? navigator.language ?? '') ?? 'en'
}

export function setLang(next: Lang): void {
  lang = next
}

export function getLang(): Lang {
  return lang
}

/**
 * The Korean is the key; every other language is a lookup away.
 *
 * A key the chosen language has not translated falls through to English
 * before it falls through to Korean, because a reader who picked Thai is far
 * more likely to read English than Hangul.
 */
export function t(ko: string): string {
  if (lang === 'ko') return ko
  return TABLES[lang][ko] ?? EN[ko] ?? ko
}

/** How a counter reads, per plural category. `{n}` is the number. */
type Forms = { one?: string; few?: string; many?: string; other: string }

/**
 * The two counters, in every language.
 *
 * Kept here rather than in the tables because these are not sentences: they
 * are a shape with a number in it, and the number decides which shape. The
 * categories are the ones `Intl.PluralRules` returns for that language, so
 * Russian gets its three and English its two without either being hand-rolled.
 */
const COUNTERS: Record<Lang, Record<string, Forms>> = {
  ko: { 곡: { other: '{n}곡' }, 개: { other: '{n}개' } },
  en: {
    곡: { one: '{n} track', other: '{n} tracks' },
    개: { one: '{n} item', other: '{n} items' },
  },
  ja: { 곡: { other: '{n}曲' }, 개: { other: '{n}件' } },
  'zh-CN': { 곡: { other: '{n} 首' }, 개: { other: '{n} 项' } },
  'zh-TW': { 곡: { other: '{n} 首' }, 개: { other: '{n} 項' } },
  es: {
    곡: { one: '{n} canción', other: '{n} canciones' },
    개: { one: '{n} elemento', other: '{n} elementos' },
  },
  'pt-BR': {
    곡: { one: '{n} faixa', other: '{n} faixas' },
    개: { one: '{n} item', other: '{n} itens' },
  },
  fr: {
    곡: { one: '{n} titre', other: '{n} titres' },
    개: { one: '{n} élément', other: '{n} éléments' },
  },
  de: {
    곡: { one: '{n} Titel', other: '{n} Titel' },
    개: { one: '{n} Element', other: '{n} Elemente' },
  },
  ru: {
    곡: { one: '{n} трек', few: '{n} трека', many: '{n} треков', other: '{n} трека' },
    개: { one: '{n} элемент', few: '{n} элемента', many: '{n} элементов', other: '{n} элемента' },
  },
  vi: { 곡: { other: '{n} bài' }, 개: { other: '{n} mục' } },
  id: { 곡: { other: '{n} lagu' }, 개: { other: '{n} item' } },
  th: { 곡: { other: '{n} เพลง' }, 개: { other: '{n} รายการ' } },
  hi: {
    곡: { one: '{n} गाना', other: '{n} गाने' },
    개: { one: '{n} आइटम', other: '{n} आइटम' },
  },
}

/** For the few strings that carry a number. */
export function tn(ko: string, n: number): string {
  const forms = COUNTERS[lang][ko] ?? COUNTERS.en[ko]
  if (!forms) return `${n}`
  let category: 'one' | 'few' | 'many' | 'other' = 'other'
  try {
    const picked = new Intl.PluralRules(lang).select(n)
    if (picked === 'one' || picked === 'few' || picked === 'many') category = picked
  } catch {
    // A runtime without plural data for this language keeps the plural form,
    // which is the one that is right for every count but 1.
  }
  return (forms[category] ?? forms.other).replace('{n}', String(n))
}
