import { db } from '@/services/supabase';
import type { Tables, TablesInsert } from '@/types/database';

export type CalendarEvent = Tables<'calendar_events'>;
export const calendarKeys = {
  events: (playerId: string) => ['calendar-events', playerId] as const,
};

export async function fetchEvents(playerId: string): Promise<CalendarEvent[]> {
  const { data, error } = await db()
    .from('calendar_events')
    .select('*')
    .eq('player_id', playerId)
    .order('event_date');
  if (error) throw error;
  return data;
}

export async function createEvent(input: TablesInsert<'calendar_events'>) {
  const { error } = await db().from('calendar_events').insert(input);
  if (error) throw error;
}

/** Cancelar = marcar (no se borra). */
export async function cancelEvent(id: string) {
  const { data, error } = await db()
    .from('calendar_events')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (data.length === 0) throw new Error('Solo papá puede cancelar eventos.');
}
