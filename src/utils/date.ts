import { format, type Locale } from 'date-fns';
import { es } from 'date-fns/locale';

export const locale: Locale = es;

/** Saludo según la hora local. */
export function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h >= 6 && h < 13) return 'Buen día';
  if (h >= 13 && h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

/** "martes 10 de noviembre" */
export function formatLongDate(date: Date): string {
  return format(date, "EEEE d 'de' MMMM", { locale: es });
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Segundos → "mm:ss" (o "h:mm:ss" si supera una hora). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Edad cumplida a partir de una fecha de nacimiento. */
export function ageFrom(birthDate: Date, today = new Date()): number {
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}
