import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Square, X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/Progress';
import { Sheet } from '@/components/ui/Sheet';
import { useStopwatch } from '@/hooks/useStopwatch';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatClock } from '@/utils/date';
import { cn } from '@/utils/cn';

/**
 * VISTA PREVIA del modo entrenamiento (Fase 1).
 * Usa el ejemplo de sesión de la especificación. No guarda nada: el registro
 * persistente de sesiones se implementa en la Fase 3.
 */
const previewSession = {
  title: 'Coordinación + técnica',
  steps: [
    {
      name: 'Activación y movilidad',
      minutes: 5,
      detail:
        'Movilidad articular de tobillos, rodillas y cadera. Trote suave con cambios de ritmo.',
    },
    {
      name: 'Escalera de coordinación',
      minutes: 5,
      detail:
        'Un pie por casillero, dos pies por casillero y desplazamiento lateral. Mirada al frente.',
    },
    {
      name: 'Dominio de pelota',
      minutes: 8,
      detail: 'Toques alternando pierna derecha e izquierda. Contá tu mejor serie sin que caiga.',
    },
    {
      name: 'Control orientado y pase',
      minutes: 8,
      detail: 'Recibí orientando el cuerpo hacia donde vas a jugar y pasá con el interior del pie.',
    },
    {
      name: 'Vuelta a la calma',
      minutes: 4,
      detail: 'Caminata, respiración profunda y estiramientos suaves.',
    },
  ],
};

export default function TrainingModePage() {
  useDocumentTitle('Modo entrenamiento');
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const watch = useStopwatch();

  const steps = previewSession.steps;
  const step = steps[index]!;
  const target = step.minutes * 60;
  const remaining = target - watch.elapsedSeconds;
  const progress = Math.min(100, (watch.elapsedSeconds / target) * 100);

  const goTo = (i: number) => {
    watch.reset();
    setIndex(i);
  };

  const exit = () => navigate('/entrenar', { replace: true });

  return (
    <div className="flex min-h-dvh flex-col bg-ink text-paper">
      <div className="bg-gold px-4 py-1.5 text-center text-[0.6875rem] font-bold tracking-[0.12em] text-ink uppercase pt-safe">
        Vista previa · no se guarda ningún dato
      </div>

      <header className="mx-auto flex w-full max-w-xl items-center gap-2 px-3 pt-3">
        <IconButton
          tone="dark"
          label="Salir de la vista previa"
          icon={<X className="size-6" />}
          onClick={exit}
        />
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-display text-sm font-semibold">{previewSession.title}</p>
          <p className="text-xs text-fog">
            Ejercicio {index + 1} de {steps.length}
          </p>
        </div>
        <span className="size-11" aria-hidden />
      </header>

      <div className="mx-auto mt-3 flex w-full max-w-xl gap-1.5 px-5" aria-hidden>
        {steps.map((s, i) => (
          <span
            key={s.name}
            className={cn(
              'h-1 flex-1 rounded-full',
              i < index ? 'bg-gold' : i === index ? 'bg-gold/70' : 'bg-ink-3',
            )}
          />
        ))}
      </div>

      <main
        key={index}
        className="animate-enter mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pt-8 text-center"
      >
        <p className="eyebrow text-gold">{step.minutes} minutos</p>
        <h1 className="mt-2 text-3xl leading-tight font-semibold">{step.name}</h1>
        <p className="mt-3 max-w-sm text-[0.9375rem] text-fog">{step.detail}</p>

        <div className="mt-8 grid aspect-video w-full place-items-center rounded-[var(--radius-card)] border border-dashed border-ink-3 text-sm text-fog">
          Imagen o video demostrativo
        </div>

        <ProgressRing
          value={progress}
          label="Tiempo del ejercicio"
          size={176}
          stroke={8}
          tone="dark"
          className="mt-8"
        >
          <div aria-live="off">
            <p className="tabular font-display text-4xl font-semibold">
              {formatClock(Math.abs(remaining))}
            </p>
            <p className="text-xs text-fog">{remaining >= 0 ? 'restante' : 'tiempo extra'}</p>
          </div>
        </ProgressRing>
      </main>

      <footer className="mx-auto w-full max-w-xl px-5 pt-6 pb-6 pb-safe">
        <div className="flex items-center justify-between">
          <IconButton
            tone="dark"
            size="lg"
            label="Ejercicio anterior"
            icon={<ChevronLeft className="size-7" />}
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
          />
          <IconButton
            tone="dark"
            size="lg"
            label="Reiniciar cronómetro"
            icon={<RotateCcw className="size-6" />}
            onClick={watch.reset}
          />
          <button
            type="button"
            onClick={watch.running ? watch.pause : watch.start}
            aria-label={watch.running ? 'Pausar' : 'Iniciar'}
            className="grid size-20 place-items-center rounded-full bg-gold text-ink shadow-[var(--shadow-float)] transition-transform active:scale-95"
          >
            {watch.running ? (
              <Pause className="size-8" fill="currentColor" />
            ) : (
              <Play className="ml-1 size-8" fill="currentColor" />
            )}
          </button>
          <IconButton
            tone="dark"
            size="lg"
            label="Finalizar sesión"
            icon={<Square className="size-5" />}
            onClick={() => {
              watch.pause();
              setConfirmEnd(true);
            }}
          />
          <IconButton
            tone="dark"
            size="lg"
            label="Ejercicio siguiente"
            icon={<ChevronRight className="size-7" />}
            disabled={index === steps.length - 1}
            onClick={() => goTo(index + 1)}
          />
        </div>
      </footer>

      <Sheet
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="¿Finalizar la sesión?"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setConfirmEnd(false)}>
              Seguir
            </Button>
            <Button variant="primary" block onClick={exit}>
              Finalizar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          En la versión completa (Fase 3) acá vas a registrar duración real, ejercicios completados,
          esfuerzo percibido, observaciones y cómo te sentiste. Esta vista previa no guarda datos.
        </p>
      </Sheet>
    </div>
  );
}
