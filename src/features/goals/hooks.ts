import { useQuery } from '@tanstack/react-query';
import { usePlayer } from '@/contexts/authContext';
import { fetchAssessments, fetchGoals, goalKeys } from './api';

export function useGoals() {
  const player = usePlayer();
  return useQuery({
    queryKey: goalKeys.goals(player.id),
    queryFn: () => fetchGoals(player.id),
    refetchOnMount: 'always',
  });
}

export function useAssessments() {
  const player = usePlayer();
  return useQuery({
    queryKey: goalKeys.assessments(player.id),
    queryFn: () => fetchAssessments(player.id),
    refetchOnMount: 'always',
  });
}
