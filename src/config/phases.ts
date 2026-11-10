import type { DevelopmentPhase } from '@/types/domain';

export const phaseNames: Record<DevelopmentPhase, string> = {
  2: 'Base de datos y usuarios',
  3: 'Entrenamiento',
  4: 'Partidos y rendimiento',
  5: 'Registro del reloj',
  6: 'Evolución y calendario',
  7: 'Pruebas y publicación',
};
