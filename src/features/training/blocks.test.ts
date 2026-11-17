import { describe, expect, it } from 'vitest';
import { clampRepeats, expandSteps, flattenBlocks, groupBlocks, totalSteps } from './blocks';

let n = 0;
const key = () => `k${n++}`;
const it_ = (id: string, block: number, repeats = 1, name: string | null = null) => ({
  id,
  block,
  block_repeats: repeats,
  block_name: name,
});

describe('módulos', () => {
  it('agrupa los ejercicios por módulo conservando el orden', () => {
    const blocks = groupBlocks(
      [it_('a', 0, 3, 'Calentamiento'), it_('b', 0, 3, 'Calentamiento'), it_('c', 1, 2)],
      key,
    );
    expect(blocks.map((b) => [b.name, b.repeats, b.items.map((i) => i.id)])).toEqual([
      ['Calentamiento', 3, ['a', 'b']],
      ['', 2, ['c']],
    ]);
  });

  it('aplana numerando los módulos 0, 1, 2… y omite los vacíos', () => {
    const flat = flattenBlocks([
      { key: '1', name: ' Fuerza ', repeats: 3, items: [{ id: 'a' }, { id: 'b' }] },
      { key: '2', name: '', repeats: 1, items: [] },
      { key: '3', name: '', repeats: 2, items: [{ id: 'c' }] },
    ]);
    expect(flat).toEqual([
      { id: 'a', block: 0, block_repeats: 3, block_name: 'Fuerza' },
      { id: 'b', block: 0, block_repeats: 3, block_name: 'Fuerza' },
      { id: 'c', block: 1, block_repeats: 2, block_name: null },
    ]);
  });

  it('las repeticiones van de 1 a 50', () => {
    expect(clampRepeats(0)).toBe(1);
    expect(clampRepeats(-4)).toBe(1);
    expect(clampRepeats(7.4)).toBe(7);
    expect(clampRepeats(500)).toBe(50);
    expect(clampRepeats(Number.NaN)).toBe(1);
  });

  it('expande: cada módulo completo, tantas vueltas como indique, y sigue el siguiente', () => {
    const steps = expandSteps([it_('a', 0, 2), it_('b', 0, 2), it_('c', 1, 1)]);
    expect(steps.map((s) => `${s.blockIndex}:${s.round}/${s.rounds}:${s.item.id}`)).toEqual([
      '0:1/2:a',
      '0:1/2:b',
      '0:2/2:a',
      '0:2/2:b',
      '1:1/1:c',
    ]);
  });

  it('sin datos de módulo (entrenamientos viejos) es un módulo de una vuelta', () => {
    const steps = expandSteps([{ id: 'x' }, { id: 'y' }]);
    expect(steps.map((s) => [s.item.id, s.round, s.rounds])).toEqual([
      ['x', 1, 1],
      ['y', 1, 1],
    ]);
  });

  it('el mismo ejercicio en dos módulos se mantiene separado', () => {
    const steps = expandSteps([it_('a', 0, 1), it_('a', 1, 2)]);
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.blockIndex)).toEqual([0, 1, 1]);
  });

  it('cuenta los pasos totales', () => {
    expect(
      totalSteps([
        { key: '1', name: '', repeats: 3, items: [1, 2] },
        { key: '2', name: '', repeats: 2, items: [1] },
      ]),
    ).toBe(8);
  });
});
