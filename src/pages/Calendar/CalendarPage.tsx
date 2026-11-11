import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, addMonths, addWeeks, format, isSameDay, isSameMonth } from 'date-fns';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Segmented } from '@/components/ui/Segmented';
import { StatTile } from '@/components/ui/StatTile';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useAuth, usePlayer } from '@/contexts/authContext';
import { useWorkouts } from '@/features/training/hooks';
import { useProgressData } from '@/features/progress/useProgressData';
import { calendarKeys, cancelEvent, fetchEvents } from '@/features/calendar/api';
import { EventSheet } from '@/features/calendar/EventSheet';
import {
  buildCalendarItems,
  categoryDot,
  categoryLabels,
  itemsOn,
  weekSummary,
} from '@/features/calendar/logic';
import { friendlyError } from '@/services/errors';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { capitalize, locale } from '@/utils/date';
import { cn } from '@/utils/cn';
import { monthGrid, weekDays } from './calendarUtils';

type View = 'day' | 'week' | 'month';

const weekdayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function CalendarPage() {
  useDocumentTitle('Calendario');
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const today = new Date();
  const { isAdmin } = useAuth();
  const player = usePlayer();
  const queryClient = useQueryClient();
  const data = useProgressData();
  const workouts = useWorkouts();
  const events = useQuery({
    queryKey: calendarKeys.events(player.id),
    queryFn: () => fetchEvents(player.id),
    refetchOnMount: 'always',
  });
  const [sheet, setSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = buildCalendarItems({
    sessions: data.sessions,
    workouts: workouts.data ?? [],
    matches: data.matches,
    assessments: data.assessments,
    events: events.data ?? [],
  });
  const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
  const summary = weekSummary(items, weekDays(cursor).map(ymd));
  const cancel = async (id: string) => {
    setError(null);
    try {
      await cancelEvent(id);
      await queryClient.invalidateQueries({ queryKey: calendarKeys.events(player.id) });
    } catch (e) {
      setError(friendlyError(e));
    }
  };
  const dayList = (d: Date) => {
    const list = itemsOn(items, ymd(d));
    if (list.length === 0) return null;
    return (
      <ul className="flex flex-col gap-1.5">
        {list.map((i) => (
          <li key={i.id} className="flex items-center gap-2 text-sm">
            <span
              className={cn('size-2.5 shrink-0 rounded-full', categoryDot[i.category])}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{i.title}</span>
              <span className="block text-xs text-muted">
                {categoryLabels[i.category]}
                {i.detail ? ` · ${i.detail}` : ''}
                {i.done ? ' · hecho' : ''}
              </span>
            </span>
            {isAdmin && i.manualId && (
              <button
                type="button"
                className="text-xs font-semibold text-muted hover:underline"
                onClick={() => void cancel(i.manualId!)}
                aria-label={`Cancelar ${i.title}`}
              >
                Cancelar
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  };

  const move = (dir: 1 | -1) =>
    setCursor((d) =>
      view === 'month' ? addMonths(d, dir) : view === 'week' ? addWeeks(d, dir) : addDays(d, dir),
    );

  const title =
    view === 'month'
      ? capitalize(format(cursor, 'MMMM yyyy', { locale }))
      : view === 'week'
        ? `Semana del ${format(weekDays(cursor)[0]!, "d 'de' MMMM", { locale })}`
        : capitalize(format(cursor, "EEEE d 'de' MMMM", { locale }));

  return (
    <>
      <TopBar title="Calendario" />
      <PageHeader
        title="Calendario"
        description="Entrenamientos, partidos, evaluaciones y descansos."
        action={
          isAdmin ? (
            <Button
              size="sm"
              onClick={() => setSheet(true)}
              leadingIcon={<CalendarPlus className="size-4" />}
            >
              Evento
            </Button>
          ) : undefined
        }
      />

      <Segmented<View>
        label="Vista"
        value={view}
        onChange={setView}
        options={[
          { value: 'day', label: 'Día' },
          { value: 'week', label: 'Semana' },
          { value: 'month', label: 'Mes' },
        ]}
      />

      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <IconButton
            label="Anterior"
            icon={<ChevronLeft className="size-5" />}
            onClick={() => move(-1)}
          />
          <div className="text-center">
            <p className="font-display font-semibold" aria-live="polite">
              {title}
            </p>
            {!isSameDay(cursor, today) && (
              <button
                type="button"
                onClick={() => setCursor(new Date())}
                className="text-xs font-semibold text-gold-strong hover:underline"
              >
                Volver a hoy
              </button>
            )}
          </div>
          <IconButton
            label="Siguiente"
            icon={<ChevronRight className="size-5" />}
            onClick={() => move(1)}
          />
        </div>

        {view === 'month' && (
          <div role="grid" aria-label={title}>
            <div role="row" className="grid grid-cols-7 text-center">
              {weekdayLabels.map((d, i) => (
                <span role="columnheader" key={i} className="py-1 text-xs font-semibold text-muted">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthGrid(cursor).map((d) => {
                const isToday = isSameDay(d, today);
                const inMonth = isSameMonth(d, cursor);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    role="gridcell"
                    aria-label={format(d, "EEEE d 'de' MMMM", { locale })}
                    aria-current={isToday ? 'date' : undefined}
                    onClick={() => {
                      setCursor(d);
                      setView('day');
                    }}
                    className={cn(
                      'tabular grid aspect-square place-items-center rounded-[10px] text-sm transition-colors',
                      isToday
                        ? 'bg-coal font-semibold text-gold hover:bg-coal-2'
                        : inMonth
                          ? 'text-ink hover:bg-sand'
                          : 'text-muted/50',
                    )}
                  >
                    <span className="flex flex-col items-center gap-0.5">
                      {format(d, 'd')}
                      <span className="flex h-1.5 gap-0.5" aria-hidden>
                        {[...new Set(itemsOn(items, ymd(d)).map((i) => i.category))]
                          .slice(0, 3)
                          .map((c) => (
                            <span key={c} className={cn('size-1.5 rounded-full', categoryDot[c])} />
                          ))}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === 'week' && (
          <ul className="flex flex-col divide-y divide-line">
            {weekDays(cursor).map((d) => (
              <li key={d.toISOString()} className="flex items-center gap-3 py-2.5">
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold tabular',
                    isSameDay(d, today) ? 'bg-coal text-gold' : 'bg-sand',
                  )}
                >
                  {format(d, 'd')}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">
                    {capitalize(format(d, 'EEEE', { locale }))}
                  </span>
                  {dayList(d) ?? <span className="block text-xs text-muted">Sin actividades</span>}
                </span>
              </li>
            ))}
          </ul>
        )}

        {view === 'day' &&
          (dayList(cursor) ?? (
            <EmptyState
              compact
              title="Día libre"
              description="No hay actividades programadas para este día."
            />
          ))}
      </Card>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-[12px] bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}
      {sheet && (
        <EventSheet
          open
          playerId={player.id}
          initialDate={ymd(cursor)}
          onClose={() => setSheet(false)}
          onSaved={() => {
            setSheet(false);
            void queryClient.invalidateQueries({ queryKey: calendarKeys.events(player.id) });
          }}
        />
      )}

      <Section title="Resumen de la semana">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Entrenamientos" value={summary.trainings || null} />
          <StatTile label="Partidos" value={summary.matches || null} />
          <StatTile label="Descansos" value={summary.rests || null} />
        </div>
      </Section>
    </>
  );
}
