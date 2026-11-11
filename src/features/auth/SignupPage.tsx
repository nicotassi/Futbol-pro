import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { ChevronLeft, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/authContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { familyApi, FamilyApiError } from '@/services/familyApi';

/**
 * Crear cuenta: cualquier familia puede registrarse sola. Cada cuenta nueva
 * tiene su propio jugador y sus datos son privados (RLS por jugador).
 */
export default function SignupPage() {
  useDocumentTitle('Crear cuenta');
  const { status, signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ adminName: '', email: '', password: '', playerName: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'ready' || status === 'no-access') return <Navigate to="/" replace />;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await familyApi.signup(form);
      const result = await signIn(form.email, form.password);
      if (result.error) {
        setError(`La cuenta se creó, pero no se pudo ingresar: ${result.error}`);
        return;
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof FamilyApiError ? err.message : 'No se pudo crear la cuenta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-ink text-paper">
      <main className="mx-auto flex w-full max-w-sm flex-col px-6 py-8 pt-safe">
        <Link
          to="/ingresar"
          className="mb-6 inline-flex items-center gap-1 text-sm text-fog hover:text-paper"
        >
          <ChevronLeft className="size-4" aria-hidden /> Ya tengo cuenta
        </Link>
        <div className="flex items-center gap-3">
          <LogoMark size={48} />
          <div>
            <p className="eyebrow text-gold">Bienvenido</p>
            <h1 className="text-2xl font-semibold">Crear cuenta</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-fog">
          Para el papá, mamá o adulto a cargo. Después vas a poder crearle una cuenta al jugador.
        </p>

        <form
          onSubmit={onSubmit}
          noValidate
          className="mt-6 flex flex-col gap-4 rounded-[22px] bg-surface p-5 text-ink"
        >
          <Input
            label="Tu nombre"
            value={form.adminName}
            onChange={set('adminName')}
            autoComplete="given-name"
          />
          <Input
            label="Tu email"
            type="email"
            value={form.email}
            onChange={set('email')}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
          />
          <div className="relative">
            <Input
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              autoComplete="new-password"
              hint="Mínimo 8 caracteres."
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
              className="absolute top-[1.625rem] right-1 grid size-11 place-items-center rounded-full text-muted hover:text-ink"
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          <Input
            label="Nombre del jugador"
            value={form.playerName}
            onChange={set('playerName')}
            placeholder="Ej.: Benja"
            autoComplete="off"
          />
          {error && (
            <p
              role="alert"
              className="rounded-[12px] bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            block
            disabled={submitting}
            leadingIcon={<UserPlus className="size-5" />}
          >
            {submitting ? 'Creando…' : 'Crear cuenta'}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-fog">
          Los datos de cada familia son privados: nadie más puede verlos.
        </p>
      </main>
    </div>
  );
}
