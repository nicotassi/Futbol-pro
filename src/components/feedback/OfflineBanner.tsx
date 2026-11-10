import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/** Aviso visible cuando no hay conexión. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-xs font-medium text-paper pt-safe"
    >
      <WifiOff className="size-3.5 text-gold" aria-hidden />
      Sin conexión. Podés seguir navegando; los registros se habilitan con internet.
    </div>
  );
}
