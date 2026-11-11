import { describe, expect, it } from 'vitest';
import familyScript from '../../scripts/family.mjs?raw';
import { identifierToEmail, PLAYER_EMAIL_DOMAIN } from './identity';

describe('identifierToEmail', () => {
  it('convierte un usuario en el email técnico del jugador', () => {
    expect(identifierToEmail('  Benja ')).toEqual({
      ok: true,
      email: `benja@${PLAYER_EMAIL_DOMAIN}`,
    });
  });

  it('deja pasar un email real', () => {
    expect(identifierToEmail('Papa@Example.com')).toEqual({ ok: true, email: 'papa@example.com' });
  });

  it('rechaza valores vacíos o inválidos', () => {
    expect(identifierToEmail('').ok).toBe(false);
    expect(identifierToEmail('be').ok).toBe(false);
    expect(identifierToEmail('benja!').ok).toBe(false);
    expect(identifierToEmail('papa@').ok).toBe(false);
  });

  it('el script de alta de usuarios usa el mismo dominio', () => {
    expect(familyScript).toContain(`'${PLAYER_EMAIL_DOMAIN}'`);
  });
});
