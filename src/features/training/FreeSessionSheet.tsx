import { useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { useAuth, usePlayer } from '@/contexts/authContext';
import { enqueueSession } from '@/services/outbox';
import { ScalePicker } from './ScalePicker';
import { WatchFields } from '@/features/sessionWatch/WatchFields';
import { emptyWatchForm, parseWatchForm, type WatchForm } from '@/features/sessionWatch/watchData';
import { postStateLabels, rpeLabels } from './format';

/** Registrar un entrenamiento que no salió de una plantilla (club, plaza, etc.). */
export function FreeSessionSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const player = usePlayer();
  const [title, setTitle] = useState('Entrenamiento del club');
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [minutes, setMinutes] = useState('');
  const [rpe, setRpe] = useState<number | null>(null);
  const [postState, setPostState] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [watch, setWatch] = useState<WatchForm>(emptyWatchForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const mins = Number(minutes);
    if (title.trim().length < 2) return setError('Poné un nombre (mínimo 2 letras).');
    if (!minutes || !Number.isInteger(mins) || mins < 1 || mins > 600)
      return setError('Indicá los minutos (1 a 600).');
    if (!date || date > today) return setError('La fecha no puede ser futura.');
    const parsed = parseWatchForm(watch);
    if ('error' in parsed) return setError(parsed.error);
    setError(null);
    setSaving(true);
    const started = new Date(`${date}T12:00:00`);
    await enqueueSession(user!.id, {
      session: {
        player_id: player.id,
        template_id: null,
        title: title.trim(),
        started_at: started.toISOString(),
        ended_at: new Date(started.getTime() + mins * 60000).toISOString(),
        status: 'completed',
        actual_minutes: mins,
        rpe,
        notes: notes.trim(),
        post_state: postState,
        client_id: crypto.randomUUID(),
        ...parsed.data,
      },
      results: [],
    });
    setSaving(false);
    setMinutes('');
    setNotes('');
    setWatch(emptyWatchForm());
    setRpe(null);
    setPostState(null);
    onSaved();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Registrar entrenamiento"
      footer={
        <Button type="submit" form="free-session" block disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      }
    >
      <form id="free-session" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input label="¿Qué hiciste?" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input
            label="Minutos"
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
        <ScalePicker
          label="Esfuerzo percibido"
          min={1}
          max={10}
          value={rpe}
          onChange={setRpe}
          labels={rpeLabels}
        />
        <ScalePicker
          label="¿Cómo terminaste?"
          min={1}
          max={5}
          value={postState}
          onChange={setPostState}
          labels={postStateLabels}
        />
        <Textarea
          label="Observaciones"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
        <WatchFields form={watch} onChange={setWatch} />
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
