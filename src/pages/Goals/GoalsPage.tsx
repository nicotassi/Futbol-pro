import { useState } from 'react';
import { Award, Flag, Medal, Moon, Plus, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { ProgressBar } from '@/components/ui/Progress';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PhaseNotice } from '@/components/feedback/PhaseNotice';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type Tab = 'goals' | 'achievements';

const pointSources = [
  { label: 'Registrar entrenamientos y partidos', icon: Award },
  { label: 'Completar objetivos y aprender habilidades', icon: Flag },
  { label: 'Mantener la constancia y reflexionar', icon: Sparkles },
  { label: 'Descansar y recuperarse también suma', icon: Moon },
];

const examples = [
  'Mejorar control con la pierna menos hábil',
  'Mejorar precisión de pases',
  'Aumentar dominio de pelota',
  'Aprender conceptos tácticos',
];

export default function GoalsPage() {
  useDocumentTitle('Objetivos');
  const [tab, setTab] = useState<Tab>('goals');

  return (
    <>
      <PageHeader
        eyebrow="Objetivos y logros"
        title="Objetivos"
        description="Metas personales, constancia y reconocimientos."
        action={
          <Button size="sm" disabled leadingIcon={<Plus className="size-4" />}>
            Nuevo
          </Button>
        }
      />

      {/* Nivel: comienza en cero de verdad. */}
      <Card tone="dark" className="flex items-center gap-4">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-full bg-ink-2 text-gold ring-1 ring-gold/40"
          aria-hidden
        >
          <Medal className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-gold">Nivel 1</p>
          <p className="font-display text-lg font-semibold">Debut</p>
          <ProgressBar
            tone="dark"
            value={0}
            label="Experiencia para el próximo nivel"
            className="mt-2"
          />
          <p className="mt-1.5 text-xs text-fog">
            0 puntos · los puntos se ganan con constancia, no con cantidad.
          </p>
        </div>
      </Card>

      <Segmented<Tab>
        className="mt-5"
        label="Ver"
        idPrefix="goals"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'goals', label: 'Objetivos' },
          { value: 'achievements', label: 'Logros' },
        ]}
      />

      {tab === 'goals' ? (
        <div role="tabpanel" id="goals-panel-goals" aria-labelledby="goals-tab-goals">
          <PhaseNotice className="mt-4" phase={4} feature="Crear y seguir objetivos" />
          <Section title="En curso">
            <Card>
              <EmptyState
                icon={<Flag className="size-6" />}
                title="Todavía no hay objetivos"
                description="Cada objetivo tendrá descripción, fechas, progreso y estado: pendiente, en curso o completado."
              />
            </Card>
          </Section>
          <Section title="Ideas para empezar">
            <ul className="flex flex-col gap-2">
              {examples.map((e) => (
                <li
                  key={e}
                  className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3 text-sm"
                >
                  <Sparkles className="size-4 shrink-0 text-gold-strong" aria-hidden />
                  {e}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      ) : (
        <div role="tabpanel" id="goals-panel-achievements" aria-labelledby="goals-tab-achievements">
          <PhaseNotice className="mt-4" phase={6} feature="El sistema de logros e insignias" />
          <Section title="Cómo se ganan puntos">
            <Card padded={false}>
              <ul className="divide-y divide-line text-sm">
                {pointSources.map(({ label, icon: Icon }) => (
                  <li key={label} className="flex items-center gap-3 px-4 py-3.5">
                    <Icon className="size-5 text-gold-strong" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </Card>
            <p className="mt-3 text-xs text-muted">
              No se premia entrenar de más ni se compara con otros chicos.
            </p>
          </Section>
        </div>
      )}
    </>
  );
}
