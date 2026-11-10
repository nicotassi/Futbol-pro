import { Dumbbell, Home, LineChart, Target, User, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Coincidencia exacta de ruta (solo para Inicio). */
  end?: boolean;
}

/** Las cinco pestañas principales de la navegación inferior. */
export const mainNav: NavItem[] = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/entrenar', label: 'Entrenar', icon: Dumbbell },
  { to: '/objetivos', label: 'Objetivos', icon: Target },
  { to: '/evolucion', label: 'Evolución', icon: LineChart },
  { to: '/perfil', label: 'Perfil', icon: User },
];
