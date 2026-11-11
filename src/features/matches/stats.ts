import type { MatchFull } from './api';

const sum = (rows: MatchFull[], pick: (m: MatchFull) => number | null | undefined) => {
  const values = rows.map(pick).filter((v): v is number => typeof v === 'number');
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
};

/**
 * Resumen de la temporada. Un total es `null` ("sin datos") si ningún partido
 * lo registró: lo no registrado no se cuenta como cero.
 */
export function seasonSummary(matches: MatchFull[]) {
  const passesOk = sum(matches, (m) => m.stats?.passes_ok);
  const passesFailed = sum(matches, (m) => m.stats?.passes_failed);
  const ratings = matches
    .map((m) => m.reflection?.rating)
    .filter((v): v is number => typeof v === 'number');
  return {
    matches: matches.length,
    goals: sum(matches, (m) => m.stats?.goals),
    assists: sum(matches, (m) => m.stats?.assists),
    minutes: sum(matches, (m) => m.minutes),
    recoveries: sum(matches, (m) => m.stats?.recoveries),
    passAccuracy:
      passesOk !== null && passesFailed !== null && passesOk + passesFailed > 0
        ? Math.round((passesOk / (passesOk + passesFailed)) * 100)
        : null,
    avgRating: ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null,
  };
}

export function resultLabel(m: Pick<MatchFull, 'goals_for' | 'goals_against'>) {
  if (m.goals_for === null || m.goals_against === null) return null;
  const outcome =
    m.goals_for > m.goals_against ? 'Ganó' : m.goals_for < m.goals_against ? 'Perdió' : 'Empató';
  return { score: `${m.goals_for} - ${m.goals_against}`, outcome };
}
