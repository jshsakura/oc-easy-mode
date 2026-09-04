// YouTube's own account and settings pages: where they are, and how to tell
// that we are standing on one.
//
// Its own module because two very distant places need to agree about the same
// two paths, and neither can import the other. The entry decides not to mount
// on them (see the note beside the check in index.ts); the settings sheet is
// what sends the reader there in the first place.

/** One of YouTube's own settings destinations, as the sheet lists it. */
export interface YouTubePage {
  /** The path, which is also what the entry matches on. */
  path: string
  /** A Korean key, translated when the sheet draws rather than here. */
  label: string
}

export const YOUTUBE_PAGES: readonly YouTubePage[] = [
  { path: '/account', label: '계정' },
  { path: '/view_all_settings', label: '환경설정' },
]

/**
 * The paths the mode stays off.
 *
 * Both destinations have siblings that are the same screen with a section
 * chosen, and YouTube spells those with an underscore rather than a slash:
 * `/account_privacy`, `/account_playback`, `/account_notifications`. A test
 * that only looked for `/account` would cover the first click and none of the
 * tabs along the top of it, so both separators count.
 */
const SETTINGS_PATH = /^\/(?:account|view_all_settings)(?:[_/]|$)/

/** Whether `pathname` is one of YouTube's own settings screens. */
export function isYouTubeSettings(pathname: string): boolean {
  return SETTINGS_PATH.test(pathname)
}

/** The address the sheet navigates to. Absolute, so it is the same page from either host. */
export function youtubeUrl(page: YouTubePage): string {
  return `https://www.youtube.com${page.path}`
}
