export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'fp-theme';
const THEME_COLORS: Record<ResolvedTheme, string> = { light: '#16171A', dark: '#0F1013' };

export function isPreference(v: unknown): v is ThemePreference {
  return v === 'system' || v === 'light' || v === 'dark';
}

export function resolveTheme(pref: ThemePreference, systemDark: boolean): ResolvedTheme {
  return pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;
}

export function getStoredPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isPreference(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

/** Aplica el tema al documento (atributo data-theme y color de la barra del navegador). */
export function applyTheme(pref: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(pref, prefersDark());
  document.documentElement.dataset.theme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[resolved]);
  return resolved;
}

export function setPreference(pref: ThemePreference): ResolvedTheme {
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    // Sin almacenamiento: el cambio vale mientras la app esté abierta.
  }
  return applyTheme(pref);
}
