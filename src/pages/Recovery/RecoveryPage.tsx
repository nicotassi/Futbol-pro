import { HeartPulse, Info } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PhaseNotice } from '@/components/feedback/PhaseNotice';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/utils/cn';

const lights = [
  {
    key: 'green',
    label: 'Verde',
    text: 'Buen estado general.',
    dot: 'bg-success',
    bg: 'bg-success-soft',
  },
  {
    key: 'yellow',
    label: 'Amarillo',
    text: 'Cansancio, descanso insuficiente o molestias que requieren atención.',
    dot: 'bg-warning-bright',
    bg: 'bg-warning-soft',
  },
  {
    key: 'red',
    label: 'Rojo',
    text: 'Dolor, lesión, enfermedad o malestar importante. Avisá a un adulto y no sigas entrenando hasta evaluar la situación.',
    dot: 'bg-danger',
    bg: 'bg-danger-soft',
  },
];

const indicators = [
  'Horas de sueño',
  'Calidad del sueño',
  'Energía al levantarse',
  'Cansancio muscular',
  'Molestias',
  'Ganas de entrenar',
  'Estado general',
  'Hidratación',
];

export default function RecoveryPage() {
  useDocumentTitle('Recuperación');
  return (
    <>
      <TopBar title="Recuperación" />
      <PageHeader
        title="Recuperación"
        description="Un registro diario simple para cuidar el cuerpo."
      />
      <PhaseNotice phase={4} feature="El registro diario de bienestar" />

      <Section title="Semáforo">
        <ul className="flex flex-col gap-2.5">
          {lights.map((l) => (
            <li key={l.key} className={cn('flex items-start gap-3 rounded-[14px] px-4 py-3', l.bg)}>
              <span className={cn('mt-1 size-3.5 shrink-0 rounded-full', l.dot)} aria-hidden />
              <p className="text-sm">
                <span className="font-semibold">{l.label}: </span>
                {l.text}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Últimos registros">
        <Card>
          <EmptyState
            icon={<HeartPulse className="size-6" />}
            title="Sin registros de bienestar"
            description="Escalas simples del 1 al 5, visibles para Benja y papá."
          />
          <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
            {indicators.map((i) => (
              <li key={i} className="rounded-full bg-sand px-2.5 py-1 text-xs text-muted">
                {i}
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <p className="mt-6 flex gap-2 text-xs text-muted">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Futbolista Pro no realiza diagnósticos ni reemplaza a profesionales de la salud o del
        deporte.
      </p>
    </>
  );
}
