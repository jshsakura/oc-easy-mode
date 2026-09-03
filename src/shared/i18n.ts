// Korean and English, keyed by the Korean.
//
// The key *is* the Korean string, so a call site reads as the sentence it
// renders and a missing translation falls back to Korean rather than to a
// bare key. Adding a language means adding a column, never touching a view.
//
// Which language: whatever the reader chose, else what YouTube itself is set
// to (its own `hl`), else the browser's. YouTube's own setting comes first
// because this UI stands in front of YouTube — reading one language on the
// page and another over it is worse than either.

export type Lang = 'ko' | 'en'

const EN: Record<string, string> = {
  // Navigation
  '둘러보기': 'Explore',
  '검색': 'Search',
  '홈': 'Home',
  '구독': 'Subscriptions',
  '시청 기록': 'History',
  '내 재생목록': 'Playlists',
  '대기열': 'Queue',
  '재생목록': 'Playlists',
  '음악': 'Music',
  '영상': 'Video',
  '영상 모드': 'Video mode',
  '내 라이브러리': 'Your library',
  '닫기': 'Close',
  '내리기': 'Collapse',
  '이지 모드 종료': 'Exit Easy Mode',
  '메뉴': 'Menu',
  '테마': 'Theme',
  '밝게': 'Light',
  '어둡게': 'Dark',

  // Transport
  '재생 중인 항목 없음': 'Nothing playing',
  '재생 / 일시정지': 'Play / pause',
  '이전': 'Previous',
  '다음': 'Next',
  '셔플': 'Shuffle',
  '반복': 'Repeat',
  '반복 안 함': 'Repeat off',
  '전체 반복': 'Repeat all',
  '한 곡 반복': 'Repeat one',
  '음소거': 'Mute',
  '화면 위치': 'Video position',
  '크게 보기': 'Large',
  '구석에 두기': 'Corner',
  '소리만 듣기': 'Audio only',

  // Lists and actions
  '가져오는 중…': 'Loading…',
  '노래, 영상, 채널 검색': 'Search songs, videos, channels',
  '무엇을 들을까요?': 'What would you like to hear?',
  '결과가 없습니다.': 'No results.',
  '보여줄 것이 없습니다.': 'Nothing to show.',
  '전체 재생': 'Play all',
  '대기열에 추가': 'Add to queue',
  '재생목록에 추가': 'Add to playlist',
  '더 보기': 'Show more',
  '재생': 'Play',
  '셔플 재생': 'Shuffle play',
  '라디오': 'Radio',
  '새 재생목록': 'New playlist',
  '재생목록이 없습니다.': 'No playlists.',
  '비어 있는 재생목록입니다.': 'This playlist is empty.',
  '재생목록 삭제': 'Delete playlist',
  '유튜브에서 열기': 'Open on YouTube',
  '비우기': 'Clear',
  '재생목록으로 저장': 'Save as playlist',
  '대기열이 비어 있습니다.': 'The queue is empty.',
  '대기열에서 빼기': 'Remove from queue',
  '더보기': 'More',
  '지금 재생': 'Play now',
  '다음에 재생': 'Play next',
  '이 곡으로 라디오': 'Start radio',
  '이 재생목록에서 제거': 'Remove from this playlist',
  '재생할 수 없음': 'Unavailable',
  '재생할 수 없는 항목입니다.': 'This item cannot be played.',
  '라디오를 만드는 중…': 'Building a radio…',
  '만들기': 'Create',
  '취소': 'Cancel',
  '삭제': 'Delete',
  '빼기': 'Remove',
  '새 재생목록 이름': 'New playlist name',
  '새 재생목록 만들기': 'Create a playlist',

  // Messages
  '유튜브에 로그인해야 볼 수 있는 내용입니다.': 'Sign in to YouTube to see this.',
  '유튜브 응답이 예상과 달랐습니다. 잠시 후 다시 시도해 주세요.':
    'YouTube answered in an unexpected shape. Please try again shortly.',
  '유튜브에서 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.':
    'Could not load from YouTube. Please try again shortly.',
  '다음에 재생합니다.': 'Playing next.',
  '대기열에 넣었습니다.': 'Added to the queue.',
  '재생목록에서 뺐습니다.': 'Removed from the playlist.',
  '삭제했습니다.': 'Deleted.',
  '유튜브 플레이어를 찾지 못했습니다. 항목을 고르면 열립니다.':
    'No YouTube player here yet. Choosing something will open one.',
  '이 곡으로는 라디오를 만들 수 없습니다.': 'No radio can be built from this track.',
}

let lang: Lang = 'ko'

/** `hl` is YouTube's own interface language, read from the page's config. */
export function pickLang(chosen: string | null, youtubeHl: string | undefined): Lang {
  if (chosen === 'ko' || chosen === 'en') return chosen
  const from = youtubeHl ?? navigator.language ?? ''
  return from.toLowerCase().startsWith('ko') ? 'ko' : 'en'
}

export function setLang(next: Lang): void {
  lang = next
}

export function getLang(): Lang {
  return lang
}

/** The Korean is the key; English is a lookup away; anything else is Korean. */
export function t(ko: string): string {
  return lang === 'en' ? (EN[ko] ?? ko) : ko
}

/** For the few strings that carry a number. */
export function tn(ko: string, n: number): string {
  const table: Record<string, string> = {
    '곡': lang === 'en' ? `${n} tracks` : `${n}곡`,
    '개': lang === 'en' ? `${n} items` : `${n}개`,
  }
  return table[ko] ?? `${n}`
}
