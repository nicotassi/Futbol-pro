import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CloudOff, HeartPulse, Info } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePlayer } from '@/contexts/authContext';
import { friendlyError } from '@/services/errors';
import { parseDateOnly } from '@/features/players/format';
import { relativeDay } from '@/features/training/format';
import { wellnessKeys } from '@/features/wellness/api';
import { useWellness } from '@/features/wellness/hooks';
import { lightInfo } from '@/features/wellness/traffic';
import { WellnessSheet } from '@/features/wellness/WellnessSheet';
import { cn } from '@/utils/cn';

export default function RecoveryPage() {
  useDocumentTitle('Recuperación');
  const player = usePlayer();
  const queryClient = useQueryClient();
  const wellness = useWellness();
  const [open, setOpen] = useState(false);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const today = wellness.data?.find((w) => w.log_date === todayStr) ?? null;
  const current = today?.traffic_light ?? null;

  return (
    <>
      <TopBar title="Recuperación" />
      <PageHeader
        title="Recuperación"
        description="Un registro diario simple para cuidar el cuerpo."
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            {today ? 'Editar hoy' : 'Registrar hoy'}
          </Button>
        }
      />

      <Section title="Semáforo">
        <ul className="flex flex-col gap-2.5">
          {(['green', 'yellow', 'red'] as const).map((key) => {
            const l = lightInfo[key];
            const active = current === key;
            return (
              <li
                key={key}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'flex items-start gap-3 rounded-[14px] px-4 py-3',
                  l.bg,
                  active && 'ring-2 ring-ink',
                )}
              >
                <span className={cn('mt-1 size-3.5 shrink-0 rounded-full', l.dot)} aria-hidden />
                <p className="text-sm">
                  <span className="font-semibold">{l.label}: </span>
                  {l.text}
                  {active && <span className="ml-1 font-semibold">← Hoy</span>}
                </p>
              </li>
            );
          })}
        </ul>
        {current === 'red' && (
          <p
            role="alert"
            className="mt-3 rounded-[12px] bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
          >
            Hoy el semáforo está en rojo: avisá a un adulto antes de entrenar.
          </p>
        )}
      </Section>

      <Section title="Últimos registros">
        {wellness.isPending && !wellness.data ? (
          <LoadingState rows={3} />
        ) : wellness.isError && !wellness.data ? (
          <ErrorState
            description={friendlyError(wellness.error)}
            onRetry={() => void wellness.refetch()}
          />
        ) : (wellness.data ?? []).length === 0 ? (
          <Card>
            <EmptyState
              icon={<HeartPulse className="size-6" />}
              title="Sin registros de bienestar"
              description="Escalas simples del 1 al 5, visibles para Benja y papá."
              action={
                <Button size="sm" onClick={() => setOpen(true)}>
                  Registrar hoy
                </Button>
              }
            />
          </Card>
        ) : (
          <Card padded={false}>
            <ul className="divide-y divide-line">
              {wellness.data!.slice(0, 14).map((w) => (
                <li key={w.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      'size-3.5 shrink-0 rounded-full',
                      w.traffic_light ? lightInfo[w.traffic_light].dot : 'bg-line',
                    )}
                    role="img"
                    aria-label={
                      w.traffic_light
                        ? `Semáforo ${lightInfo[w.traffic_light].label}`
                        : 'Sin semáforo'
                    }
                  />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-medium">
                      {relativeDay(parseDateOnly(w.log_date))}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {[
                        w.sleep_hours !== null ? `${w.sleep_hours} h de sueño` : null,
                        w.energy !== null ? `Energía ${w.energy}/5` : null,
                        w.discomfort,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Sin detalle'}
                    </span>
                  </span>
                  {w.pending && (
                    <Badge tone="warning">
                      <CloudOff className="size-3" aria-hidden />
                      Pendiente
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>

      <p className="mt-6 flex gap-2 text-xs text-muted">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Futbolista Pro no realiza diagnósticos ni reemplaza a profesionales de la salud o del
        deporte.
      </p>

      {open && (
        <WellnessSheet
          open
          today={today}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            void queryClient.invalidateQueries({ queryKey: wellnessKeys.all(player.id) });
          }}
        />
      )}
    </>
  );
}
