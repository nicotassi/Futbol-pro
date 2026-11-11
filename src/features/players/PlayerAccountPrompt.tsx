import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Smartphone } from 'lucide-react';
import { useAuth, usePlayer } from '@/contexts/authContext';
import { fetchPlayerAccess, playerKeys } from './api';

/** Aviso en Inicio (solo para el adulto): el jugador todavía no tiene cuenta. */
export function PlayerAccountPrompt() {
  const { isAdmin } = useAuth();
  const player = usePlayer();
  const access = useQuery({
    queryKey: playerKeys.access(player.id),
    queryFn: () => fetchPlayerAccess(player.id),
    enabled: isAdmin,
  });

  if (!isAdmin || !access.data || access.data.some((a) => a.role === 'player')) return null;

  return (
    <Link
      to="/admin"
      className="mt-4 flex items-center gap-3 rounded-[var(--radius-card)] border border-gold/50 bg-gold-soft p-4 transition-colors hover:bg-gold-soft/70"
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full bg-coal text-gold"
        aria-hidden
      >
        <Smartphone className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-semibold">
          Creá la cuenta de {player.first_name}
        </span>
        <span className="block text-sm text-muted">
          Para que use la app en su celular con su propio usuario.
        </span>
      </span>
      <ChevronRight className="size-5 text-muted" aria-hidden />
    </Link>
  );
}
