import { format } from 'date-fns';
import type { SessionPatch } from './api';
import { parseWatchForm, type WatchData, type WatchForm } from '@/features/sessionWatch/watchData';

export interface SessionEditForm {
  title: string;
  date: string; // yyyy-MM-dd
  minutes: string;
  rpe: number | null;
  postState: number | null;
  notes: string;
  watch: WatchForm;
}

/** Hora local (HH:mm:ss) de un instante, para conservarla al cambiar solo el día. */
const timeOf = (iso: string) => format(new Date(iso), 'HH:mm:ss');

/**
 * Valida la edición de una sesión ya hecha. Si cambia el día se conserva la hora
 * original; el fin se recalcula con la duración.
 */
export function buildSessionPatch(
  form: SessionEditForm,
  original: { started_at: string; ended_at: string | null },
  today: string,
): { patch: SessionPatch & WatchData } | { error: string } {
  const title = form.title.trim();
  if (title.length < 2) return { error: 'Poné un nombre (mínimo 2 letras).' };
  if (title.length > 80) return { error: 'El nombre puede tener hasta 80 letras.' };
  if (!form.date || form.date > today) return { error: 'La fecha no puede ser futura.' };

  let minutes: number | null = null;
  if (form.minutes.trim() !== '') {
    const n = Number(form.minutes);
    if (!Number.isInteger(n) || n < 1 || n > 600) return { error: 'Los minutos van de 1 a 600.' };
    minutes = n;
  }
  if (form.notes.trim().length > 2000) return { error: 'Las observaciones son muy largas.' };

  const watch = parseWatchForm(form.watch);
  if ('error' in watch) return { error: watch.error };

  const sameDay = format(new Date(original.started_at), 'yyyy-MM-dd') === form.date;
  const started = sameDay
    ? new Date(original.started_at)
    : new Date(`${form.date}T${timeOf(original.started_at)}`);
  const ended =
    minutes !== null
      ? new Date(started.getTime() + minutes * 60000)
      : original.ended_at
        ? new Date(
            started.getTime() +
              (new Date(original.ended_at).getTime() - new Date(original.started_at).getTime()),
          )
        : null;

  return {
    patch: {
      title,
      started_at: started.toISOString(),
      ended_at: ended ? ended.toISOString() : null,
      actual_minutes: minutes,
      rpe: form.rpe,
      post_state: form.postState,
      notes: form.notes.trim() || null,
      ...watch.data,
    },
  };
}
