/**
 * Módulos de un entrenamiento: grupos de ejercicios que se repiten N veces.
 * En la base cada ejercicio guarda el número de su módulo, cuántas veces se
 * repite y su nombre; acá se agrupan y se expanden en "vueltas".
 */
export interface BlockFields {
  block: number;
  block_repeats: number;
  block_name: string | null;
}

export interface Block<T> {
  key: string;
  name: string;
  repeats: number;
  items: T[];
}

export const MAX_REPEATS = 50;
export const clampRepeats = (n: number) => Math.max(1, Math.min(MAX_REPEATS, Math.round(n) || 1));

/** Agrupa ejercicios (ya ordenados) en módulos según su número de módulo. */
export function groupBlocks<T extends BlockFields>(items: T[], makeKey: () => string): Block<T>[] {
  const blocks: Block<T>[] = [];
  let lastBlock: number | null = null;
  for (const it of items) {
    if (lastBlock === it.block && blocks.length) {
      blocks[blocks.length - 1]!.items.push(it);
    } else {
      blocks.push({
        key: makeKey(),
        name: it.block_name ?? '',
        repeats: clampRepeats(it.block_repeats),
        items: [it],
      });
      lastBlock = it.block;
    }
  }
  return blocks;
}

/** Nombre a mostrar: el elegido o "Módulo N". */
export const blockLabel = (name: string, index: number) => name.trim() || `Módulo ${index + 1}`;

/** Aplana los módulos al formato que se guarda (módulos vacíos se omiten). */
export function flattenBlocks<T>(blocks: Block<T>[]): (T & BlockFields)[] {
  const out: (T & BlockFields)[] = [];
  blocks
    .filter((b) => b.items.length > 0)
    .forEach((b, bi) => {
      for (const it of b.items)
        out.push({
          ...it,
          block: bi,
          block_repeats: clampRepeats(b.repeats),
          block_name: b.name.trim() || null,
        });
    });
  return out;
}

export interface Step<T> {
  item: T;
  blockIndex: number;
  blockName: string;
  round: number;
  rounds: number;
}

/**
 * Secuencia que se hace en el modo entrenamiento: cada módulo se recorre completo
 * (todos sus ejercicios, en orden) tantas veces como indique, y luego sigue el módulo siguiente.
 */
export function expandSteps<T extends object>(
  items: (T & Partial<BlockFields>)[],
): Step<T & Partial<BlockFields>>[] {
  const withDefaults = items.map((it) => ({
    ...it,
    block: it.block ?? 0,
    block_repeats: it.block_repeats ?? 1,
    block_name: it.block_name ?? null,
  }));
  const blocks = groupBlocks(withDefaults, () => '');
  const steps: Step<T & Partial<BlockFields>>[] = [];
  blocks.forEach((b, bi) => {
    for (let round = 1; round <= b.repeats; round++)
      for (const it of b.items)
        steps.push({
          item: items[withDefaults.indexOf(it)]!,
          blockIndex: bi,
          blockName: blockLabel(b.name, bi),
          round,
          rounds: b.repeats,
        });
  });
  return steps;
}

/** Cuántos ejercicios y "pasos" totales tiene (un ejercicio de un módulo x3 cuenta 3). */
export function totalSteps(blocks: Block<unknown>[]): number {
  return blocks.reduce((n, b) => n + b.items.length * clampRepeats(b.repeats), 0);
}
