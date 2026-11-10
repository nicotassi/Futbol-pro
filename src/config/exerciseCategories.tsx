import { Brain, Dumbbell, HeartPulse, Shuffle, Target, Zap, type LucideIcon } from 'lucide-react';
import type { ExerciseCategory } from '@/types/domain';

export interface CategoryInfo {
  id: ExerciseCategory;
  name: string;
  short: string;
  description: string;
  icon: LucideIcon;
  topics: string[];
}

/** Las seis categorías de la biblioteca definidas en la especificación. */
export const exerciseCategories: CategoryInfo[] = [
  {
    id: 'speed',
    name: 'Velocidad y explosividad',
    short: 'Velocidad',
    description: 'Aceleración, frenadas, cambios de dirección y reacción.',
    icon: Zap,
    topics: [
      'Aceleraciones 5-10-15 m',
      'Sprint corto',
      'Cambios de dirección',
      'Frenadas y arranques',
      'Reacción ante estímulos',
      'Saltos',
      'Potencia',
      'Desplazamientos laterales',
    ],
  },
  {
    id: 'technique',
    name: 'Técnica individual',
    short: 'Técnica',
    description: 'Dominio, conducción, pase, control orientado y remate.',
    icon: Target,
    topics: [
      'Dominio de pelota',
      'Conducción',
      'Cambios de dirección con pelota',
      'Pases cortos',
      'Pases largos',
      'Control orientado',
      'Perfil corporal',
      'Remates',
      'Uso de ambas piernas',
      'Precisión de pase',
    ],
  },
  {
    id: 'strength',
    name: 'Fuerza y estabilidad',
    short: 'Fuerza',
    description: 'Peso corporal, tronco estable y equilibrio.',
    icon: Dumbbell,
    topics: [
      'Sentadillas',
      'Flexiones adaptadas',
      'Plancha',
      'Zancadas',
      'Equilibrio',
      'Estabilidad del tronco',
      'Fuerza con peso corporal',
      'Coordinación corporal',
    ],
  },
  {
    id: 'endurance',
    name: 'Resistencia cardiovascular',
    short: 'Resistencia',
    description: 'Carrera, intervalos adaptados y juegos con pelota.',
    icon: HeartPulse,
    topics: [
      'Carrera continua',
      'Intervalos adaptados',
      'Circuitos con pelota',
      'Juegos de persecución',
      'Recuperación entre esfuerzos',
    ],
  },
  {
    id: 'coordination',
    name: 'Coordinación y agilidad',
    short: 'Coordinación',
    description: 'Escalera, equilibrio, ritmo y reacción visual o auditiva.',
    icon: Shuffle,
    topics: [
      'Escalera de coordinación',
      'Equilibrio unipodal',
      'Coordinación óculo-pédica',
      'Cambios de ritmo',
      'Saltos coordinados',
      'Reacción visual',
      'Reacción auditiva',
    ],
  },
  {
    id: 'tactics',
    name: 'Inteligencia táctica',
    short: 'Táctica',
    description: 'Escaneo, lectura del espacio y toma de decisiones.',
    icon: Brain,
    topics: [
      'Escaneo antes de recibir',
      'Lectura del espacio',
      'Orientación corporal',
      'Toma de decisiones',
      'Anticipación',
      'Desmarques',
      'Juego entre líneas',
      'Ocupación de espacios',
    ],
  },
];
