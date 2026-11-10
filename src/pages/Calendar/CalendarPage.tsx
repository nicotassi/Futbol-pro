import { useState } from 'react';
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
import { PhaseNotice } from '@/components/feedback/PhaseNotice';
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
          <Button size="sm" disabled leadingIcon={<CalendarPlus className="size-4" />}>
            Evento
          </Button>
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
                        ? 'bg-ink font-semibold text-gold hover:bg-ink-2'
                        : inMonth
                          ? 'text-ink hover:bg-sand'
                          : 'text-muted/50',
                    )}
                  >
                    {format(d, 'd')}
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
                    isSameDay(d, today) ? 'bg-ink text-gold' : 'bg-sand',
                  )}
                >
                  {format(d, 'd')}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">
                    {capitalize(format(d, 'EEEE', { locale }))}
                  </span>
                  <span className="block text-xs text-muted">Sin actividades</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {view === 'day' && (
          <EmptyState
            compact
            title="Día libre"
            description="No hay actividades programadas para este día."
          />
        )}
      </Card>

      <PhaseNotice className="mt-4" phase={6} feature="Crear y editar eventos del calendario" />

      <Section title="Resumen semanal">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Entrenamientos" value={null} />
          <StatTile label="Partidos" value={null} />
          <StatTile label="Descansos" value={null} />
        </div>
      </Section>
    </>
  );
}
