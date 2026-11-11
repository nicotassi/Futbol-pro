import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/authContext';
import { flushOutbox, listOutbox, setOutboxSyncedHandler } from '@/services/outbox';

/** Envía los registros pendientes al iniciar y cada vez que vuelve la conexión. */
export function OutboxSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    setOutboxSyncedHandler(() => {
      for (const key of ['sessions', 'matches', 'wellness'])
        void queryClient.invalidateQueries({ queryKey: [key] });
    });
    const flush = () => void flushOutbox(userId);
    void listOutbox().then(flush);
    window.addEventListener('online', flush);
    const interval = window.setInterval(flush, 60_000);
    return () => {
      window.removeEventListener('online', flush);
      window.clearInterval(interval);
      setOutboxSyncedHandler(null);
    };
  }, [user, queryClient]);

  return null;
}
