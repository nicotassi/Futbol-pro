import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, CloudOff, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { friendlyError } from '@/services/errors';
import { relativeDay } from '@/features/training/format';
import { parseDateOnly } from '@/features/players/format';
import { STAT_KEYS, matchKeys, removeMatch } from './api';
import { scaleQuestions, statLabels } from './form';
import { resultLabel } from './stats';
import type { MatchView } from './hooks';
import { REFLECTION_SCALES } from './api';
import { usePlayer } from '@/contexts/authContext';

const outcomeTone = { Ganó: 'success', Empató: 'neutral', Perdió: 'danger' } as const;

export function MatchList({
  matches,
  onEdit,
}: {
  matches: MatchView[];
  onEdit: (m: MatchView) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {matches.map((m) => (
        <MatchItem key={m.id} match={m} onEdit={() => onEdit(m)} />
      ))}
    </ul>
  );
}

function MatchItem({ match: m, onEdit }: { match: MatchView; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const player = usePlayer();
  const queryClient = useQueryClient();
  const result = resultLabel(m);
  const stats = STAT_KEYS.filter((k) => m.stats?.[k] !== null && m.stats?.[k] !== undefined);
  const scales = REFLECTION_SCALES.filter((k) => m.reflection?.[k] != null);
  const texts: [string, string | null | undefined][] = [
    ['Qué hice bien', m.reflection?.did_well],
    ['Qué quiero mejorar', m.reflection?.to_improve],
    ['Mi mejor jugada', m.reflection?.best_play_what],
    ['Qué decisión tomé', m.reflection?.best_play_decision],
    ['Qué salió bien', m.reflection?.best_play_good],
    ['Qué haría distinto', m.reflection?.best_play_different],
  ];

  const remove = async () => {
    try {
      await removeMatch(m.id);
      await queryClient.invalidateQueries({ queryKey: matchKeys.all(player.id) });
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  return (
    <li>
      <Card padded={false}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">vs {m.opponent}</span>
            <span className="block text-xs text-muted">
              {relativeDay(parseDateOnly(m.played_on))}
              {m.competition ? ` · ${m.competition}` : ''}
              {m.minutes !== null ? ` · ${m.minutes} min` : ''}
            </span>
          </span>
          {m.pending && (
            <Badge tone="warning">
              <CloudOff className="size-3" aria-hidden />
              Pendiente
            </Badge>
          )}
          {result && (
            <span className="text-right">
              <span className="block font-display font-semibold tabular">{result.score}</span>
              <Badge tone={outcomeTone[result.outcome as keyof typeof outcomeTone]}>
                {result.outcome}
              </Badge>
            </span>
          )}
          <ChevronDown
            className={`size-5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>

        {open && (
          <div className="border-t border-line px-4 py-4 text-sm">
            {m.position || m.starter !== null ? (
              <p className="mb-3 text-muted">
                {[m.position, m.starter === null ? null : m.starter ? 'Titular' : 'Suplente']
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}

            <h3 className="eyebrow mb-2">Estadísticas</h3>
            {stats.length === 0 ? (
              <p className="text-muted">No se registraron estadísticas.</p>
            ) : (
              <dl className="grid grid-cols-3 gap-2">
                {stats.map((k) => (
                  <div key={k} className="rounded-[10px] bg-sand px-2.5 py-2">
                    <dt className="text-xs text-muted">{statLabels[k]}</dt>
                    <dd className="font-display text-lg font-semibold tabular">{m.stats![k]}</dd>
                  </div>
                ))}
              </dl>
            )}

            {(scales.length > 0 || texts.some(([, v]) => v)) && (
              <>
                <h3 className="eyebrow mt-4 mb-2">Mi evaluación</h3>
                <ul className="flex flex-col gap-1">
                  {scales.map((k) => (
                    <li key={k} className="flex justify-between gap-3">
                      <span>{scaleQuestions[k]}</span>
                      <span className="font-semibold tabular">{m.reflection![k]}/5</span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-2 flex flex-col gap-2">
                  {texts
                    .filter(([, v]) => v)
                    .map(([label, v]) => (
                      <div key={label}>
                        <dt className="text-xs text-muted">{label}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                </dl>
              </>
            )}
            {m.notes && <p className="mt-3 text-muted">{m.notes}</p>}

            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-danger">
                {error}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={onEdit}
                leadingIcon={<Pencil className="size-4" />}
              >
                Editar
              </Button>
              {!m.pending &&
                (confirming ? (
                  <Button size="sm" variant="danger" onClick={() => void remove()}>
                    Confirmar: quitar partido
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirming(true)}
                    leadingIcon={<Trash2 className="size-4" />}
                  >
                    Quitar
                  </Button>
                ))}
            </div>
          </div>
        )}
      </Card>
    </li>
  );
}
