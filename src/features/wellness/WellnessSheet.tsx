import { useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { useAuth, usePlayer } from '@/contexts/authContext';
import { enqueueWellness } from '@/services/outbox';
import { ScalePicker } from '@/features/training/ScalePicker';
import { cn } from '@/utils/cn';
import type { WellnessView } from './hooks';
import { lightInfo, wellnessLight } from './traffic';

const good: Record<number, string> = {
  1: 'Muy bajo',
  2: 'Bajo',
  3: 'Normal',
  4: 'Bueno',
  5: 'Muy bueno',
};
const tired: Record<number, string> = {
  1: 'Nada',
  2: 'Poco',
  3: 'Algo',
  4: 'Bastante',
  5: 'Muchísimo',
};

interface Form {
  sleep_hours: string;
  sleep_quality: number | null;
  energy: number | null;
  soreness: number | null;
  motivation: number | null;
  overall: number | null;
  hydration: number | null;
  pain_level: string;
  sick: boolean;
  discomfort: string;
  notes: string;
}

const blank: Form = {
  sleep_hours: '',
  sleep_quality: null,
  energy: null,
  soreness: null,
  motivation: null,
  overall: null,
  hydration: null,
  pain_level: '0',
  sick: false,
  discomfort: '',
  notes: '',
};

const fromLog = (w: WellnessView): Form => ({
  sleep_hours: w.sleep_hours === null ? '' : String(w.sleep_hours),
  sleep_quality: w.sleep_quality,
  energy: w.energy,
  soreness: w.soreness,
  motivation: w.motivation,
  overall: w.overall,
  hydration: w.hydration,
  pain_level: String(w.pain_level),
  sick: w.sick,
  discomfort: w.discomfort ?? '',
  notes: w.notes ?? '',
});

/** Registro diario de bienestar (uno por día). Muestra el semáforo mientras se completa. */
export function WellnessSheet({
  open,
  today: existing,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** Registro de hoy, si ya existe (se edita en lugar de crear otro). */
  today: WellnessView | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const player = usePlayer();
  const [form, setForm] = useState<Form>(() => (existing ? fromLog(existing) : blank));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const hoursText = form.sleep_hours.trim().replace(',', '.');
  const hours = hoursText === '' ? null : Number(hoursText);
  const hoursInvalid = hours !== null && (Number.isNaN(hours) || hours < 0 || hours > 16);
  const light = wellnessLight({
    sleep_hours: hoursInvalid ? null : hours,
    sleep_quality: form.sleep_quality,
    energy: form.energy,
    soreness: form.soreness,
    motivation: form.motivation,
    overall: form.overall,
    hydration: form.hydration,
    pain_level: Number(form.pain_level),
    sick: form.sick,
    discomfort: form.discomfort,
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (hoursInvalid) return setError('Las horas de sueño van de 0 a 16.');
    if (light === null) return setError('Completá al menos un dato para guardar.');
    setError(null);
    setSaving(true);
    await enqueueWellness(user!.id, {
      player_id: player.id,
      log_date: format(new Date(), 'yyyy-MM-dd'),
      sleep_hours: hours,
      sleep_quality: form.sleep_quality,
      energy: form.energy,
      soreness: form.soreness,
      motivation: form.motivation,
      overall: form.overall,
      hydration: form.hydration,
      pain_level: Number(form.pain_level),
      sick: form.sick,
      discomfort: form.discomfort.trim(),
      notes: form.notes.trim(),
      client_id: existing?.client_id ?? crypto.randomUUID(),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="¿Cómo estás hoy?"
      footer={
        <Button type="submit" form="wellness-form" block disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      }
    >
      <form id="wellness-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div
          role="status"
          className={cn(
            'flex items-start gap-3 rounded-[14px] px-4 py-3',
            light ? lightInfo[light].bg : 'bg-sand',
          )}
        >
          <span
            className={cn(
              'mt-1 size-3.5 shrink-0 rounded-full',
              light ? lightInfo[light].dot : 'bg-line',
            )}
            aria-hidden
          />
          <p className="text-sm">
            {light ? (
              <>
                <span className="font-semibold">Semáforo: {lightInfo[light].label}. </span>
                {lightInfo[light].text}
              </>
            ) : (
              'El semáforo aparece cuando completes algún dato.'
            )}
          </p>
        </div>

        <Input
          label="Horas de sueño"
          inputMode="decimal"
          value={form.sleep_hours}
          onChange={(e) => set('sleep_hours', e.target.value)}
        />
        <ScalePicker
          label="Calidad del sueño"
          min={1}
          max={5}
          value={form.sleep_quality}
          onChange={(v) => set('sleep_quality', v)}
          labels={good}
        />
        <ScalePicker
          label="Energía al levantarme"
          min={1}
          max={5}
          value={form.energy}
          onChange={(v) => set('energy', v)}
          labels={good}
        />
        <ScalePicker
          label="Cansancio muscular"
          min={1}
          max={5}
          value={form.soreness}
          onChange={(v) => set('soreness', v)}
          labels={tired}
        />
        <ScalePicker
          label="Ganas de entrenar"
          min={1}
          max={5}
          value={form.motivation}
          onChange={(v) => set('motivation', v)}
          labels={good}
        />
        <ScalePicker
          label="Estado general"
          min={1}
          max={5}
          value={form.overall}
          onChange={(v) => set('overall', v)}
          labels={good}
        />
        <ScalePicker
          label="Hidratación"
          min={1}
          max={5}
          value={form.hydration}
          onChange={(v) => set('hydration', v)}
          labels={good}
        />

        <Select
          label="Dolor"
          value={form.pain_level}
          onChange={(e) => set('pain_level', e.target.value)}
        >
          <option value="0">Sin dolor</option>
          <option value="1">Leve</option>
          <option value="2">Moderado</option>
          <option value="3">Fuerte</option>
        </Select>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            className="size-5 accent-[var(--color-gold-strong)]"
            checked={form.sick}
            onChange={(e) => set('sick', e.target.checked)}
          />
          Me siento enfermo
        </label>
        <Input
          label="Molestias (dónde y cómo)"
          value={form.discomfort}
          onChange={(e) => set('discomfort', e.target.value)}
        />
        <Textarea
          label="Notas (opcional)"
          rows={2}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
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
