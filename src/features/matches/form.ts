import {
  REFLECTION_SCALES,
  REFLECTION_TEXTS,
  STAT_KEYS,
  type MatchPayload,
  type StatKey,
} from './api';

export interface MatchForm {
  played_on: string;
  opponent: string;
  competition: string;
  goals_for: string;
  goals_against: string;
  position: string;
  minutes: string;
  starter: '' | 'yes' | 'no';
  notes: string;
  stats: Record<StatKey, string>;
  scales: Record<(typeof REFLECTION_SCALES)[number], number | null>;
  texts: Record<(typeof REFLECTION_TEXTS)[number], string>;
}

export const emptyMatchForm = (today: string): MatchForm => ({
  played_on: today,
  opponent: '',
  competition: '',
  goals_for: '',
  goals_against: '',
  position: '',
  minutes: '',
  starter: '',
  notes: '',
  stats: Object.fromEntries(STAT_KEYS.map((k) => [k, ''])) as MatchForm['stats'],
  scales: Object.fromEntries(REFLECTION_SCALES.map((k) => [k, null])) as MatchForm['scales'],
  texts: Object.fromEntries(REFLECTION_TEXTS.map((k) => [k, ''])) as MatchForm['texts'],
});

/** Vacío = no registrado (null). Devuelve undefined si el texto no es un entero válido. */
function int(text: string, min: number, max: number): number | null | undefined {
  const t = text.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}

export const statLabels: Record<StatKey, string> = {
  goals: 'Goles',
  assists: 'Asistencias',
  passes_ok: 'Pases buenos',
  passes_failed: 'Pases errados',
  recoveries: 'Recuperaciones',
  interceptions: 'Intercepciones',
  shots: 'Tiros',
  shots_on_target: 'Tiros al arco',
  duels_won: 'Duelos ganados',
  losses: 'Pérdidas',
  fouls: 'Faltas',
};

export const scaleQuestions: Record<(typeof REFLECTION_SCALES)[number], string> = {
  physical: '¿Cómo me sentí físicamente?',
  focus: '¿Cómo estuvo mi concentración?',
  decisions: '¿Tomé buenas decisiones?',
  offered_support: '¿Me ofrecí para recibir la pelota?',
  helped_recover: '¿Ayudé al equipo a recuperar?',
  rating: 'En general, ¿cómo estuvo mi partido?',
};

/** Valida el formulario y arma lo que se guarda. Lo no completado queda como "no registrado". */
export function buildMatchPayload(
  f: MatchForm,
  playerId: string,
  clientId: string,
  today: string,
): { payload: MatchPayload } | { error: string } {
  if (f.opponent.trim().length < 1) return { error: 'Poné el nombre del rival.' };
  if (!f.played_on || f.played_on > today) return { error: 'La fecha no puede ser futura.' };
  const goalsFor = int(f.goals_for, 0, 99);
  const goalsAgainst = int(f.goals_against, 0, 99);
  if (goalsFor === undefined || goalsAgainst === undefined)
    return { error: 'Los goles del resultado van de 0 a 99.' };
  if ((goalsFor === null) !== (goalsAgainst === null))
    return { error: 'Completá los dos números del resultado, o dejá los dos vacíos.' };
  const minutes = int(f.minutes, 0, 200);
  if (minutes === undefined) return { error: 'Los minutos jugados van de 0 a 200.' };

  const stats = {} as MatchPayload['stats'];
  for (const k of STAT_KEYS) {
    const v = int(f.stats[k], 0, 999);
    if (v === undefined) return { error: `${statLabels[k]}: ingresá un número entero (0 o más).` };
    stats[k] = v;
  }
  if (stats.shots !== null && stats.shots_on_target !== null && stats.shots_on_target > stats.shots)
    return { error: 'Los tiros al arco no pueden ser más que los tiros.' };

  return {
    payload: {
      match: {
        player_id: playerId,
        played_on: f.played_on,
        opponent: f.opponent.trim(),
        competition: f.competition.trim(),
        goals_for: goalsFor,
        goals_against: goalsAgainst,
        position: f.position.trim(),
        minutes,
        starter: f.starter === '' ? null : f.starter === 'yes',
        notes: f.notes.trim(),
        client_id: clientId,
      },
      stats,
      reflection: {
        ...f.scales,
        ...(Object.fromEntries(
          REFLECTION_TEXTS.map((k) => [k, f.texts[k].trim()]),
        ) as MatchForm['texts']),
      },
    },
  };
}
