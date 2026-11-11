import { CloudUpload, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePendingSessions } from '@/features/training/hooks';

/** Aviso visible sin conexión o con registros pendientes de sincronizar. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const pending = usePendingSessions().length;
  if (online && pending === 0) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-coal px-4 py-2 text-xs font-medium text-bone pt-safe"
    >
      {online ? (
        <>
          <CloudUpload className="size-3.5 text-gold" aria-hidden />
          Sincronizando {pending === 1 ? '1 registro' : `${pending} registros`}…
        </>
      ) : (
        <>
          <WifiOff className="size-3.5 text-gold" aria-hidden />
          Sin conexión.{' '}
          {pending > 0
            ? `${pending === 1 ? '1 registro guardado' : `${pending} registros guardados`} en el celular: se envían al volver internet.`
            : 'Lo que registres se guarda en el celular y se envía al volver internet.'}
        </>
      )}
    </div>
  );
}
