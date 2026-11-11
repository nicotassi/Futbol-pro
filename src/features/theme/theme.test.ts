import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyTheme,
  getStoredPreference,
  isPreference,
  resolveTheme,
  setPreference,
} from './theme';

describe('tema', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('"sistema" sigue al dispositivo; claro y oscuro son fijos', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('valida lo guardado y usa "sistema" por defecto', () => {
    expect(isPreference('dark')).toBe(true);
    expect(isPreference('azul')).toBe(false);
    expect(getStoredPreference()).toBe('system');
    localStorage.setItem('fp-theme', 'azul');
    expect(getStoredPreference()).toBe('system');
  });

  it('guarda la elección y la aplica al documento', () => {
    expect(setPreference('dark')).toBe('dark');
    expect(localStorage.getItem('fp-theme')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
