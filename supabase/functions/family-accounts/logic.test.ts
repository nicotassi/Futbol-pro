import { describe, expect, it } from 'vitest';
import { PLAYER_EMAIL_DOMAIN as APP_DOMAIN } from '../../../src/services/identity';
import {
  PLAYER_EMAIL_DOMAIN,
  validateSignup,
  validatePassword,
  validatePlayerAccount,
} from './logic';

const valid = {
  email: ' Papa@Example.com ',
  password: 'segura-123',
  adminName: 'Nico',
  playerName: 'Benja',
};

describe('validateSignup', () => {
  it('normaliza los datos válidos', () => {
    expect(validateSignup(valid)).toEqual({
      ok: true,
      data: {
        email: 'papa@example.com',
        password: 'segura-123',
        adminName: 'Nico',
        playerName: 'Benja',
      },
    });
  });

  it('rechaza datos inválidos con mensajes en español', () => {
    expect(validateSignup({ ...valid, playerName: '' })).toEqual({
      ok: false,
      error: 'Ingresá el nombre del jugador.',
    });
    expect(validateSignup({ ...valid, email: 'nope' })).toMatchObject({ ok: false });
    expect(validateSignup({ ...valid, password: 'corta' })).toMatchObject({ ok: false });
    expect(validateSignup({ ...valid, adminName: '  ' })).toMatchObject({ ok: false });
    expect(validateSignup({ ...valid, email: `x@${PLAYER_EMAIL_DOMAIN}` })).toMatchObject({
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
