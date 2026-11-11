import { Settings } from 'lucide-react';
import { LogoMark } from '@/components/brand/Logo';
import { Card } from '@/components/ui/Card';

/** Se muestra si el build no tiene la configuración de Supabase. No simula ningún backend. */
export function SetupRequiredPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="flex items-center gap-3">
        <LogoMark size={48} />
        <h1 className="text-xl font-semibold">Falta conectar la base de datos</h1>
      </div>
      <Card>
        <div className="flex gap-3">
          <Settings className="mt-0.5 size-5 shrink-0 text-gold-strong" aria-hidden />
          <div className="text-sm">
            <p>
              Para usar Futbolista Pro hay que configurar Supabase. Creá el archivo{' '}
              <code>.env.local</code> con:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-ink p-3 text-xs text-paper">
              {
                'VITE_SUPABASE_URL=https://<proyecto>.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=<clave pública>'
              }
            </pre>
            <p className="mt-3 text-muted">
              Las instrucciones completas están en el README (sección “Fase 2”).
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
