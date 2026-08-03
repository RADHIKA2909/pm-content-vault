import { useLocalStorage } from './useLocalStorage.js'

/**
 * The preferences Settings owns, and their storage keys.
 *
 * Declared in one place because the alternative already bit: `pmv.library.view`
 * is written by the Library's own view toggle, and a Settings page that
 * invented a second key would present a "Default library view" control that
 * disagreed with the view the user was actually looking at.
 */
export const PREFERENCES = {
  libraryView: { key: 'pmv.library.view', fallback: 'grid' },
  linkTarget: { key: 'pmv.links.target', fallback: 'new' },
  answerStyle: { key: 'pmv.ai.answerStyle', fallback: 'balanced' },
}

export function usePreference(name) {
  const { key, fallback } = PREFERENCES[name]
  return useLocalStorage(key, fallback)
}

/**
 * The same value outside React.
 *
 * Anchors need the link target at render time and there's no state to react to
 * — the preference only has to be right when the element is built.
 */
export function readPreference(name) {
  const { key, fallback } = PREFERENCES[name]
  try {
    const stored = window.localStorage.getItem(key)
    return stored === null ? fallback : JSON.parse(stored)
  } catch {
    return fallback
  }
}

/** The `target` attribute for an external link, per the user's choice. */
export const linkTarget = () => (readPreference('linkTarget') === 'same' ? '_self' : '_blank')
