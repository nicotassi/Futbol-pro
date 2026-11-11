import { useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { friendlyError } from '@/services/errors';
import { ScalePicker } from '@/features/training/ScalePicker';
import {
  createAssessment,
  createGoal,
  dimensionLabels,
  type Dimension,
  type GoalInput,
} from './api';

const Error_ = ({ text }: { text: string | null }) =>
  text ? (
    <p
      role="alert"
      className="rounded-[12px] bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
    >
      {text}
    </p>
  ) : null;

/** Objetivo nuevo: papá lo crea aprobado; Benja lo propone y papá lo aprueba. */
export function GoalSheet({
  open,
  playerId,
  isAdmin,
  onClose,
  onSaved,
}: {
  open: boolean;
  playerId: string;
  isAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const today = format(new Date(), 'yyyy-MM-dd');
    if (name.trim().length < 2) return setError('Poné un nombre (mínimo 2 letras).');
    if (target && target < today) return setError('La fecha objetivo no puede ser pasada.');
    const input: GoalInput = {
      name: name.trim(),
      description: description.trim() || null,
      target_date: target || null,
    };
    setSaving(true);
    try {
      await createGoal(playerId, input, isAdmin);
      onSaved();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isAdmin ? 'Nuevo objetivo' : 'Proponer un objetivo'}
      footer={
        <Button type="submit" form="goal-form" block disabled={saving}>
          {saving ? 'Guardando…' : isAdmin ? 'Crear objetivo' : 'Proponer a papá'}
        </Button>
      }
    >
      <form id="goal-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Objetivo" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea
          label="Descripción (opcional)"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          label="Fecha objetivo (opcional)"
          type="date"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        {!isAdmin && (
          <p className="text-xs text-muted">
            Papá lo revisa y lo aprueba. Mientras tanto podés ir marcando tu progreso.
          </p>
        )}
        <Error_ text={error} />
      </form>
    </Sheet>
  );
}

/** Evaluación física (la carga papá). */
export function AssessmentSheet({
  open,
  playerId,
  onClose,
  onSaved,
}: {
  open: boolean;
  playerId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [dimension, setDimension] = useState<Dimension>('speed');
  const [test, setTest] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const num = value.trim() === '' ? null : Number(value.replace(',', '.'));
    if (test.trim().length < 2) return setError('Poné el nombre de la prueba (mínimo 2 letras).');
    if (!date || date > format(new Date(), 'yyyy-MM-dd'))
      return setError('La fecha no puede ser futura.');
    if (num !== null && (Number.isNaN(num) || Math.abs(num) >= 1e8))
      return setError('El resultado debe ser un número.');
    if (num === null && score === null)
      return setError('Cargá el resultado, el puntaje, o los dos.');
    setSaving(true);
    try {
      await createAssessment(playerId, {
        assessed_on: date,
        dimension,
        test_name: test.trim(),
        value: num,
        unit: unit.trim() || null,
        score,
        notes: notes.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nueva evaluación física"
      footer={
        <Button type="submit" form="assessment-form" block disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar evaluación'}
        </Button>
      }
    >
      <form id="assessment-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Select
          label="Qué se evalúa"
          value={dimension}
          onChange={(e) => setDimension(e.target.value as Dimension)}
        >
          {Object.entries(dimensionLabels).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
        <Input
          label="Prueba"
          value={test}
          onChange={(e) => setTest(e.target.value)}
          hint="Por ejemplo: Carrera de 20 m"
        />
        <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Resultado"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Input
            label="Unidad"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            hint="s, m, reps…"
          />
        </div>
        <ScalePicker label="Puntaje" min={1} max={10} value={score} onChange={setScore} />
        <Textarea
          label="Notas (opcional)"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Error_ text={error} />
      </form>
    </Sheet>
  );
}
