import { useMemo } from 'react';
import { useSessions } from '@/features/training/hooks';
import { useMatches } from '@/features/matches/hooks';
import { useWellness } from '@/features/wellness/hooks';
import { useAssessments, useGoals } from '@/features/goals/hooks';
import type { ProgressInput } from './logic';

/** Reúne todos los registros del jugador para evolución, logros y calendario. */
export function useProgressData() {
  const sessions = useSessions();
  const matches = useMatches();
  const wellness = useWellness();
  const goals = useGoals();
  const assessments = useAssessments();
  const queries = [sessions, matches, wellness, goals, assessments];
  const input = useMemo<ProgressInput>(
    () => ({
      sessions: sessions.data ?? [],
      matches: matches.data ?? [],
      wellness: wellness.data ?? [],
      goals: goals.data ?? [],
      assessments: assessments.data ?? [],
    }),
    [sessions.data, matches.data, wellness.data, goals.data, assessments.data],
  );
  return {
    input,
    sessions: sessions.data ?? [],
    matches: matches.data ?? [],
    wellness: wellness.data ?? [],
    goals: goals.data ?? [],
    assessments: assessments.data ?? [],
    isPending: queries.some((q) => q.isPending && !q.data),
    error: queries.find((q) => q.isError && !q.data)?.error ?? null,
  };
}
