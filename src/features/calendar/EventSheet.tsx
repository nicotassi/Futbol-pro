import { useState, type FormEvent } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { friendlyError } from '@/services/errors';
import { createEvent } from './api';
import { categoryLabels, type CalendarCategory } from './logic';

export function EventSheet({
  open,
  playerId,
  initialDate,
  onClose,
  onSaved,
}: {
  open: boolean;
  playerId: string;
  initialDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CalendarCategory>('club_training');
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState('');
  const [minutes, setMinutes] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const mins = minutes.trim() === '' ? null : Number(minutes);
    if (title.trim().length < 2) return setError('Poné un título (mínimo 2 letras).');
    if (!date) return setError('Elegí una fecha.');
    if (mins !== null && (!Number.isInteger(mins) || mins < 1 || mins > 600))
      return setError('Los minutos van de 1 a 600.');
    setSaving(true);
    try {
      await createEvent({
        player_id: playerId,
        title: title.trim(),
        category,
        event_date: date,
        start_time: time || null,
        est_minutes: mins,
        description: description.trim() || null,
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
      title="Nuevo evento"
      footer={
        <Button type="submit" form="event-form" block disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar evento'}
        </Button>
      }
    >
      <form id="event-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Select
          label="Tipo"
          value={category}
          onChange={(e) => setCategory(e.target.value as CalendarCategory)}
        >
          {Object.entries(categoryLabels).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input
            label="Hora (opcional)"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <Input
          label="Duración en minutos (opcional)"
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
        <Textarea
          label="Descripción (opcional)"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {error && (
          <p
            role="alert"
            className="rounded-[12px] bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
          >
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}
