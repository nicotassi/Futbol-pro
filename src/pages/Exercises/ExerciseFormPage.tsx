import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TopBar } from '@/components/layout/TopBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { LoadingState } from '@/components/feedback/LoadingState';
import { exerciseCategories } from '@/config/exerciseCategories';
import { usePlayer } from '@/contexts/authContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { friendlyError } from '@/services/errors';
import { useExercises } from '@/features/training/hooks';
import {
  createExercise,
  trainingKeys,
  updateExercise,
  type Exercise,
} from '@/features/training/api';
import { exerciseFormSchema, type ExerciseFormInput } from '@/features/training/exerciseSchema';

const empty: ExerciseFormInput = {
  name: '',
  category: 'technique',
  objective: '',
  description: '',
  difficulty: '1',
  est_minutes: '',
  materials: '',
  steps: '',
  common_mistakes: '',
  precautions: '',
  result_indicator: '',
  media_url: '',
};

const toForm = (e: Exercise): ExerciseFormInput => ({
  name: e.name,
  category: e.category,
  objective: e.objective ?? '',
  description: e.description ?? '',
  difficulty: String(e.difficulty),
  est_minutes: e.est_minutes ? String(e.est_minutes) : '',
  materials: e.materials.join(', '),
  steps: e.steps.join('\n'),
  common_mistakes: e.common_mistakes.join('\n'),
  precautions: e.precautions ?? '',
  result_indicator: e.result_indicator ?? '',
  media_url: e.media_url ?? '',
});

type Errors = Partial<Record<keyof ExerciseFormInput, string>>;

/** Alta y edición de ejercicios (solo papá). */
export default function ExerciseFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  useDocumentTitle(editing ? 'Editar ejercicio' : 'Nuevo ejercicio');
  const exercises = useExercises();
  if (editing && exercises.isPending) return <LoadingState rows={3} />;
  const existing = exercises.data?.find((e) => e.id === id);
  return <ExerciseForm key={id ?? 'nuevo'} id={id} initial={existing ? toForm(existing) : empty} />;
}

function ExerciseForm({ id, initial }: { id?: string; initial: ExerciseFormInput }) {
  const editing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const player = usePlayer();
  const online = useOnlineStatus();
  const [form, setForm] = useState<ExerciseFormInput>(initial);
  const [errors, setErrors] = useState<Errors>({});

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof createExercise>[1]) =>
      editing ? updateExercise(id!, input) : createExercise(player.id, input),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: trainingKeys.exercises(player.id) });
      navigate(`/entrenar/ejercicios/${saved.id}`, { replace: true });
    },
  });

  const set =
    (key: keyof ExerciseFormInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setErrors((x) => ({ ...x, [key]: undefined }));
    };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = exerciseFormSchema.safeParse(form);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues)
        next[issue.path[0] as keyof ExerciseFormInput] ??= issue.message;
      setErrors(next);
      return;
    }
    mutation.mutate(parsed.data);
  };

  return (
    <>
      <TopBar
        title={editing ? 'Editar ejercicio' : 'Nuevo ejercicio'}
        backTo="/entrenar/ejercicios"
      />
      <PageHeader title={editing ? 'Editar ejercicio' : 'Nuevo ejercicio'} />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <Input label="Nombre" value={form.name} onChange={set('name')} error={errors.name} />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Categoría"
              value={form.category}
              onChange={set('category')}
              error={errors.category}
            >
              {exerciseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select label="Dificultad" value={String(form.difficulty)} onChange={set('difficulty')}>
              <option value="1">Básico</option>
              <option value="2">Intermedio</option>
              <option value="3">Avanzado</option>
            </Select>
          </div>
          <Input
            label="Objetivo"
            value={form.objective}
            onChange={set('objective')}
            error={errors.objective}
            hint="¿Qué mejora este ejercicio?"
          />
          <Textarea
            label="Descripción"
            value={form.description}
            onChange={set('description')}
            error={errors.description}
            rows={3}
          />
          <Input
            label="Duración estimada (minutos)"
            inputMode="numeric"
            value={form.est_minutes}
            onChange={set('est_minutes')}
            error={errors.est_minutes}
          />
        </Card>
        <Card className="flex flex-col gap-4">
          <Textarea
            label="Paso a paso"
            value={form.steps}
            onChange={set('steps')}
            error={errors.steps}
            rows={5}
            hint="Un paso por línea."
          />
          <Input
            label="Materiales"
            value={form.materials}
            onChange={set('materials')}
            hint="Separados por coma. Ej.: Pelota, Conos"
          />
          <Textarea
            label="Errores frecuentes"
            value={form.common_mistakes}
            onChange={set('common_mistakes')}
            error={errors.common_mistakes}
            rows={3}
            hint="Uno por línea."
          />
          <Textarea
            label="Precauciones"
            value={form.precautions}
            onChange={set('precautions')}
            error={errors.precautions}
            rows={2}
          />
          <Input
            label="Cómo medir el resultado"
            value={form.result_indicator}
            onChange={set('result_indicator')}
            error={errors.result_indicator}
            hint="Ej.: Mejor serie de toques"
          />
          <Input
            label="Video o imagen (enlace)"
            value={form.media_url}
            onChange={set('media_url')}
            error={errors.media_url}
            inputMode="url"
            hint="Opcional. Ej.: un enlace de YouTube."
          />
        </Card>
        {mutation.isError && (
          <p
            role="alert"
            className="rounded-[12px] bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger"
          >
            {friendlyError(mutation.error)}
          </p>
        )}
        {!online && (
          <p className="text-sm text-warning">
            Sin conexión: para guardar ejercicios necesitás internet.
          </p>
        )}
        <Button type="submit" size="lg" block disabled={mutation.isPending || !online}>
          {mutation.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear ejercicio'}
        </Button>
      </form>
    </>
  );
}
