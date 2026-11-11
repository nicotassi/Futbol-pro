import { Link } from 'react-router';
import { ChevronRight, Clock, Star } from 'lucide-react';
import { categoryInfo, difficultyLabel } from './exerciseMeta';
import type { Exercise } from './api';

export function ExerciseCard({ exercise, favorite }: { exercise: Exercise; favorite?: boolean }) {
  const { icon: Icon, short } = categoryInfo(exercise.category);
  return (
    <Link
      to={`/entrenar/ejercicios/${exercise.id}`}
      className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3.5 shadow-[var(--shadow-card)] transition-colors hover:border-gold/50"
    >
      <span
        className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-gold"
        aria-hidden
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-display font-semibold">{exercise.name}</span>
          {favorite && (
            <Star className="size-3.5 shrink-0 fill-gold text-gold" aria-label="Favorito" />
          )}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <span>{short}</span>
          <span aria-hidden>·</span>
          <span>{difficultyLabel[exercise.difficulty]}</span>
          {exercise.est_minutes && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-0.5">
                <Clock className="size-3" aria-hidden />
                {exercise.est_minutes} min
              </span>
            </>
          )}
          {exercise.is_custom && (
            <>
              <span aria-hidden>·</span>
              <span className="text-gold-strong">Propio</span>
            </>
          )}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}
