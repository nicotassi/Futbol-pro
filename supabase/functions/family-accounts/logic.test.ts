import { describe, expect, it } from 'vitest';
import { PLAYER_EMAIL_DOMAIN as APP_DOMAIN } from '../../../src/services/identity';
import {
  PLAYER_EMAIL_DOMAIN,
  validateBootstrap,
  validatePassword,
  validatePlayerAccount,
} from './logic';

const valid = {
  code: 'abcd-efgh',
  email: ' Papa@Example.com ',
  password: 'segura-123',
  adminName: 'Nico',
  playerName: 'Benja',
};

describe('validateBootstrap', () => {
  it('normaliza los datos válidos', () => {
    expect(validateBootstrap(valid)).toEqual({
      ok: true,
      data: {
        code: 'ABCD-EFGH',
        email: 'papa@example.com',
        password: 'segura-123',
        adminName: 'Nico',
        playerName: 'Benja',
      },
    });
    expect(validateBootstrap({ ...valid, code: 'ABCDEFGH' })).toMatchObject({
      ok: true,
      data: { code: 'ABCD-EFGH' },
    });
  });

  it('rechaza datos inválidos con mensajes en español', () => {
    expect(validateBootstrap({ ...valid, code: '123' })).toEqual({
      ok: false,
      error: 'El código de instalación no es válido.',
    });
    expect(validateBootstrap({ ...valid, email: 'nope' })).toMatchObject({ ok: false });
    expect(validateBootstrap({ ...valid, password: 'corta' })).toMatchObject({ ok: false });
    expect(validateBootstrap({ ...valid, adminName: '  ' })).toMatchObject({ ok: false });
    expect(validateBootstrap({ ...valid, email: `x@${PLAYER_EMAIL_DOMAIN}` })).toMatchObject({
      ok: false,
    });
  });
});

describe('validatePlayerAccount', () => {
  it('acepta usuario y contraseña válidos', () => {
    expect(validatePlayerAccount({ username: ' Benja ', password: 'messi2026' })).toEqual({
      ok: true,
      data: { username: 'benja', password: 'messi2026' },
    });
  });
  it('rechaza usuarios con espacios o símbolos', () => {
    expect(validatePlayerAccount({ username: 'ben ja', password: 'messi2026' }).ok).toBe(false);
    expect(validatePlayerAccount({ username: 'be', password: 'messi2026' }).ok).toBe(false);
  });
});

describe('validatePassword', () => {
  it('exige al menos 8 caracteres', () => {
    expect(validatePassword({ password: '1234567' }).ok).toBe(false);
    expect(validatePassword({ password: '12345678' }).ok).toBe(true);
  });
});

it('el dominio técnico coincide con el de la app', () => {
  expect(PLAYER_EMAIL_DOMAIN).toBe(APP_DOMAIN);
});
