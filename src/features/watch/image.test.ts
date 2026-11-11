import { describe, expect, it } from 'vitest';
import { fitWithin, sha256Hex } from './image';

describe('imágenes del reloj', () => {
  it('reduce al lado mayor y conserva la proporción', () => {
    expect(fitWithin(4096, 2048)).toEqual({ width: 2048, height: 1024 });
    expect(fitWithin(1000, 3000)).toEqual({ width: 683, height: 2048 });
  });
  it('nunca agranda', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it('la huella SHA-256 es estable', async () => {
    const h = await sha256Hex(new Blob(['abc']));
    expect(h).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
