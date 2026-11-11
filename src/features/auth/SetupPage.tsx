import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/authContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { familyApi, familyKeys, FamilyApiError } from '@/services/familyApi';

/** Configuración inicial: crea la cuenta de papá y el jugador con el código de instalación. */
export default function SetupPage() {
  useDocumentTitle('Configuración inicial');
  const { status, signIn } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // El enlace de instalación puede traer el código: /configuracion?codigo=XXXX-XXXX
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    code: params.get('codigo') ?? '',
    adminName: '',
    email: '',
    password: '',
    password2: '',
    playerName: 'Benja',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'ready' || status === 'no-access') return <Navigate to="/" replace />;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSubmitting(true);
    try {
      await familyApi.bootstrap({
        code: form.code,
        email: form.email,
        password: form.password,
        adminName: form.adminName,
        playerName: form.playerName,
      });
      void queryClient.invalidateQueries({ queryKey: familyKeys.status });
      const result = await signIn(form.email, form.password);
      if (result.error) {
        setError(`La cuenta se creó, pero no se pudo ingresar: ${result.error}`);
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(
        err instanceof FamilyApiError ? err.message : 'No se pudo completar la configuración.',
      );
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
          <ChevronLeft className="size-4" aria-hidden /> Volver al ingreso
        </Link>
        <div className="flex items-center gap-3">
          <LogoMark size={48} />
          <div>
            <p className="eyebrow text-gold">Primera vez</p>
            <h1 className="text-2xl font-semibold">Configurar la app</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-fog">
          Creá tu cuenta de administrador. Después vas a poder crear la cuenta del jugador desde
          Administración.
        </p>

        <form
          onSubmit={onSubmit}
          noValidate
          className="mt-6 flex flex-col gap-4 rounded-[22px] bg-surface p-5 text-ink"
        >
          <Input
            label="Código de instalación"
            value={form.code}
            onChange={set('code')}
            placeholder="XXXX-XXXX"
            autoCapitalize="characters"
            autoComplete="off"
            hint="Te lo pasa Claude. Sirve una sola vez."
          />
          <Input
            label="Tu nombre"
            value={form.adminName}
            onChange={set('adminName')}
            placeholder="Ej.: Nico"
            autoComplete="given-name"
          />
          <Input
            label="Tu email"
            type="email"
            value={form.email}
            onChange={set('email')}
            autoComplete="email"
            inputMode="email"
          />
          <Input
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
            hint="Mínimo 8 caracteres."
          />
          <Input
            label="Repetí la contraseña"
            type="password"
            value={form.password2}
            onChange={set('password2')}
            autoComplete="new-password"
          />
          <Input
            label="Nombre del jugador"
            value={form.playerName}
            onChange={set('playerName')}
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
            leadingIcon={<Sparkles className="size-5" />}
          >
            {submitting ? 'Configurando…' : 'Crear mi cuenta'}
          </Button>
        </form>
      </main>
    </div>
  );
}
