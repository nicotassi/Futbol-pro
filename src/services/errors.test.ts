import { describe, expect, it } from 'vitest';
import { friendlyError } from './errors';

describe('friendlyError', () => {
  it('credenciales inválidas', () => {
    expect(
      friendlyError({ message: 'Invalid login credentials', code: 'invalid_credentials' }),
    ).toBe('Usuario o contraseña incorrectos.');
  });
  it('permisos', () => {
    expect(friendlyError({ message: 'x', code: '42501' })).toBe(
      'No tenés permiso para hacer esto.',
    );
  });
  it('error desconocido', () => {
    expect(friendlyError(new Error('boom'))).toBe('Ocurrió un error inesperado. Intentá de nuevo.');
  });
});
