import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/authContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { SplashScreen } from './SplashScreen';

export default function LoginPage() {
  useDocumentTitle('Ingresar');
  const { status, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const online = useOnlineStatus();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (status === 'loading' && !submitting) return <SplashScreen />;
  if (status !== 'signed-out' && status !== 'loading') return <Navigate to={from} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(identifier, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-paper">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full border-[18px] border-gold/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full border border-gold/15"
      />

      <main className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10 pt-safe">
        <div className="animate-enter flex flex-col items-center text-center">
          <LogoMark size={88} />
          <h1 className="mt-6 font-display text-2xl font-bold tracking-[0.16em]">
            FUTBOLISTA <span className="text-gold">PRO</span>
          </h1>
          <p className="mt-2 text-[0.6875rem] tracking-[0.22em] text-fog uppercase">
            Entrená · Aprendé · Evolucioná
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="animate-enter mt-10 flex flex-col gap-4 rounded-[22px] bg-surface p-5 text-ink shadow-[var(--shadow-float)]"
        >
          <Input
            label="Usuario o email"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
          <div className="relative">
            <Input
              label="Contraseña"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
              className="absolute right-1 bottom-0 grid size-11 place-items-center rounded-full text-muted hover:text-ink"
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-[12px] bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger"
            >
              {error}
            </p>
          )}
          {!online && !error && (
            <p className="rounded-[12px] bg-warning-soft px-3 py-2.5 text-sm text-warning">
              Sin conexión. Para ingresar la primera vez necesitás internet.
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            disabled={submitting}
            leadingIcon={<LogIn className="size-5" />}
          >
            {submitting ? 'Ingresando…' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-fog">
          Las cuentas las crea papá. ¿Te olvidaste la contraseña? Pedile que la cambie.
        </p>
      </main>
    </div>
  );
}
