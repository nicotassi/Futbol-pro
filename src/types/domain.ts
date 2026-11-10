/**
 * Tipos de dominio compartidos.
 * En la Fase 2 se complementan con los tipos generados desde la base de datos (Supabase).
 */

export type UserRole = 'admin' | 'player';

export type ExerciseCategory =
  'speed' | 'technique' | 'strength' | 'endurance' | 'coordination' | 'tactics';

export type GoalStatus = 'pending' | 'in_progress' | 'completed';

export type TrafficLight = 'green' | 'yellow' | 'red';

export type SkillDimension =
  'control' | 'passing' | 'speed' | 'endurance' | 'coordination' | 'vision';

export type CalendarCategory =
  'club_training' | 'extra_training' | 'match' | 'assessment' | 'rest' | 'goal' | 'special';

/** Fase del plan de desarrollo en la que se habilita una función. */
export type DevelopmentPhase = 2 | 3 | 4 | 5 | 6 | 7;
