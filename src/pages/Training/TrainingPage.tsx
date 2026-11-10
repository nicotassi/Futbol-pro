import { Link } from 'react-router';
import { ClipboardList, LayoutTemplate, Play, Plus, Timer } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PhaseNotice } from '@/components/feedback/PhaseNotice';
import { exerciseCategories } from '@/config/exerciseCategories';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function TrainingPage() {
  useDocumentTitle('Entrenar');
  return (
    <>
      <PageHeader
        eyebrow="Centro de entrenamiento"
        title="Entrenar"
        description="Sesiones, plantillas y biblioteca de ejercicios."
      />

      <Card tone="dark" className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -bottom-16 size-48 rounded-full border-[10px] border-gold/15"
        />
        <p className="eyebrow text-gold">Modo entrenamiento</p>
        <h2 className="mt-1 text-xl font-semibold text-paper">Un ejercicio por pantalla</h2>
        <p className="mt-1 max-w-sm text-sm text-fog">
          Cronómetro, series, descansos y avance paso a paso. Probá la vista previa de la interfaz.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton
            to="/entrenar/sesion/vista-previa"
            variant="accent"
            leadingIcon={<Play className="size-4" />}
          >
            Ver vista previa
          </LinkButton>
        </div>
      </Card>

      <PhaseNotice className="mt-4" phase={3} feature="Crear, guardar y registrar entrenamientos" />

      <Section
        title="Próximas sesiones"
        action={
          <Button size="sm" variant="secondary" disabled leadingIcon={<Plus className="size-4" />}>
            Nueva
          </Button>
        }
      >
        <Card>
          <EmptyState
            icon={<Timer className="size-6" />}
            title="No hay sesiones programadas"
            description="Con el constructor vas a poder armar una sesión, elegir ejercicios y asignarle fecha."
          />
        </Card>
      </Section>

      <Section title="Plantillas">
        <Card>
          <EmptyState
            icon={<LayoutTemplate className="size-6" />}
            title="Todavía no hay plantillas"
            description="Las plantillas guardan entrenamientos que se repiten, como “Coordinación + técnica — 30 min”."
          />
        </Card>
      </Section>

      <Section
        title="Biblioteca de ejercicios"
        action={
          <Link
            to="/entrenar/ejercicios"
            className="text-sm font-semibold text-gold-strong hover:underline"
          >
            Ver todo
          </Link>
        }
      >
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {exerciseCategories.map(({ id, short, icon: Icon, topics }) => (
            <li key={id}>
              <Link
                to={`/entrenar/ejercicios?categoria=${id}`}
                className="flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-gold/50"
              >
                <span
                  className="grid size-10 place-items-center rounded-full bg-ink text-gold"
                  aria-hidden
                >
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-display font-semibold">{short}</span>
                  <span className="text-xs text-muted">{topics.length} temas</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Historial">
        <Card>
          <EmptyState
            compact
            icon={<ClipboardList className="size-5" />}
            title="Sin sesiones realizadas"
            description="Cada sesión guardará duración real, ejercicios completados, esfuerzo percibido y datos del reloj."
          />
        </Card>
      </Section>
    </>
  );
}
