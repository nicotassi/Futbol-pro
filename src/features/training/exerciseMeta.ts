import { exerciseCategories } from '@/config/exerciseCategories';

export const categoryInfo = (id: string) =>
  exerciseCategories.find((c) => c.id === id) ?? exerciseCategories[0]!;

export const difficultyLabel = ['', 'Básico', 'Intermedio', 'Avanzado'];
