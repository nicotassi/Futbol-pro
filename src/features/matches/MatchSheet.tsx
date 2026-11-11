import { useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { useAuth, usePlayer } from '@/contexts/authContext';
import { enqueueMatch } from '@/services/outbox';
import { ScalePicker } from '@/features/training/ScalePicker';
import { REFLECTION_SCALES, STAT_KEYS } from './api';
import {
  buildMatchPayload,
  emptyMatchForm,
  scaleQuestions,
  statLabels,
  type MatchForm,
} from './form';
import type { MatchView } from './hooks';

const ratingLabels: Record<number, string> = {
  1: 'Muy mal',
  2: 'Mal',
  3: 'Normal',
  4: 'Bien',
  5: 'Muy bien',
};

const str = (v: number | string | null | undefined) =>
  v === null || v === undefined ? '' : String(v);

function formFrom(m: MatchView): MatchForm {
  const f = emptyMatchForm(m.played_on);
  f.opponent = m.opponent;
  f.competition = str(m.competition);
  f.goals_for = str(m.goals_for);
  f.goals_against = str(m.goals_against);
  f.position = str(m.position);
  f.minutes = str(m.minutes);
  f.starter = m.starter === null ? '' : m.starter ? 'yes' : 'no';
  f.notes = str(m.notes);
  for (const k of STAT_KEYS) f.stats[k] = str(m.stats?.[k]);
  for (const k of REFLECTION_SCALES) f.scales[k] = m.reflection?.[k] ?? null;
  for (const k of Object.keys(f.texts) as (keyof MatchForm['texts'])[])
    f.texts[k] = str(m.reflection?.[k]);
  return f;
}

/** Registrar o editar un partido: datos, estadísticas y evaluación personal. */
export function MatchSheet({
  open,
  match,
  onClose,
  onSaved,
}: {
  open: boolean;
  match: MatchView | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const player = usePlayer();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState<MatchForm>(() =>
    match ? formFrom(match) : emptyMatchForm(today),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof MatchForm>(k: K, v: MatchForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const r = buildMatchPayload(form, player.id, match?.client_id ?? crypto.randomUUID(), today);
    if ('error' in r) return setError(r.error);
    setError(null);
    setSaving(true);
    await enqueueMatch(user!.id, r.payload);
    setSaving(false);
    onSaved();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={match ? 'Editar partido' : 'Registrar partido'}
      footer={
        <Button type="submit" form="match-form" block disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar partido'}
        </Button>
      }
    >
      <form id="match-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha"
            type="date"
            value={form.played_on}
            onChange={(e) => set('played_on', e.target.value)}
          />
          <Input
            label="Rival"
            value={form.opponent}
            onChange={(e) => set('opponent', e.target.value)}
          />
        </div>
        <Input
          label="Competencia (opcional)"
          value={form.competition}
          onChange={(e) => set('competition', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Goles a favor"
            inputMode="numeric"
            value={form.goals_for}
            onChange={(e) => set('goals_for', e.target.value)}
          />
          <Input
            label="Goles en contra"
            inputMode="numeric"
            value={form.goals_against}
            onChange={(e) => set('goals_against', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Minutos jugados"
            inputMode="numeric"
            value={form.minutes}
            onChange={(e) => set('minutes', e.target.value)}
          />
          <Select
            label="¿Fue titular?"
            value={form.starter}
            onChange={(e) => set('starter', e.target.value as MatchForm['starter'])}
          >
            <option value="">No registrar</option>
            <option value="yes">Sí</option>
            <option value="no">No</option>
          </Select>
        </div>
        <Input
          label="Posición (opcional)"
          value={form.position}
          onChange={(e) => set('position', e.target.value)}
        />

        <fieldset className="flex flex-col gap-3">
          <legend className="text-base font-semibold">Mis estadísticas</legend>
          <p className="text-xs text-muted">
            Completá solo lo que contaste. Lo que dejes vacío queda “sin registrar”, no cuenta como
            cero.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {STAT_KEYS.map((k) => (
              <Input
                key={k}
                label={statLabels[k]}
                inputMode="numeric"
                value={form.stats[k]}
                onChange={(e) => set('stats', { ...form.stats, [k]: e.target.value })}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-base font-semibold">Mi evaluación</legend>
          {REFLECTION_SCALES.map((k) => (
            <ScalePicker
              key={k}
              label={scaleQuestions[k]}
              min={1}
              max={5}
              value={form.scales[k]}
              onChange={(v) => set('scales', { ...form.scales, [k]: v })}
              labels={ratingLabels}
            />
          ))}
          <Textarea
            label="¿Qué hice bien?"
            rows={2}
            value={form.texts.did_well}
            onChange={(e) => set('texts', { ...form.texts, did_well: e.target.value })}
          />
          <Textarea
            label="¿Qué quiero mejorar?"
            rows={2}
            value={form.texts.to_improve}
            onChange={(e) => set('texts', { ...form.texts, to_improve: e.target.value })}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-base font-semibold">Mi mejor jugada</legend>
          <Textarea
            label="¿Qué pasó?"
            rows={2}
            value={form.texts.best_play_what}
            onChange={(e) => set('texts', { ...form.texts, best_play_what: e.target.value })}
          />
          <Textarea
            label="¿Qué decisión tomé?"
            rows={2}
            value={form.texts.best_play_decision}
            onChange={(e) => set('texts', { ...form.texts, best_play_decision: e.target.value })}
          />
          <Textarea
            label="¿Qué salió bien?"
            rows={2}
            value={form.texts.best_play_good}
            onChange={(e) => set('texts', { ...form.texts, best_play_good: e.target.value })}
          />
          <Textarea
            label="¿Qué haría distinto?"
            rows={2}
            value={form.texts.best_play_different}
            onChange={(e) => set('texts', { ...form.texts, best_play_different: e.target.value })}
          />
        </fieldset>

        <Textarea
          label="Observaciones (opcional)"
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
