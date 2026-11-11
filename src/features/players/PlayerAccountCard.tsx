import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { familyApi, FamilyApiError } from '@/services/familyApi';
import { USERNAME_PATTERN } from '@/services/identity';
import { playerKeys, type AccessEntry, type Player } from './api';

const MIN_PASSWORD = 8;

function errorText(error: unknown) {
  return error instanceof FamilyApiError ? error.message : 'No se pudo completar la operación.';
}

/** Alta de la cuenta del jugador y cambio de contraseña (solo papá). */
export function PlayerAccountCard({ player, access }: { player: Player; access: AccessEntry[] }) {
  const playerAccount = access.find((a) => a.role === 'player');
  return playerAccount ? (
    <ResetPassword player={player} username={playerAccount.username} />
  ) : (
    <CreateAccount player={player} />
  );
}

function CreateAccount({ player }: { player: Player }) {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const suggested = player.first_name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]/g, '');
  const [username, setUsername] = useState(suggested);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => familyApi.createPlayerAccount(username, password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: playerKeys.access(player.id) }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const u = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(u))
      return setLocalError('Usuario: de 3 a 30 letras o números, sin espacios.');
    if (password.length < MIN_PASSWORD)
      return setLocalError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
    if (password !== password2) return setLocalError('Las contraseñas no coinciden.');
    mutation.mutate();
  };

  const error = localError ?? (mutation.isError ? errorText(mutation.error) : null);

  return (
    <Card tone="gold">
      <div className="flex items-start gap-3">
        <UserPlus className="mt-0.5 size-5 shrink-0 text-gold-strong" aria-hidden />
        <div>
          <p className="font-display font-semibold">Crear la cuenta de {player.first_name}</p>
          <p className="text-sm text-muted">
            Con este usuario y contraseña va a ingresar desde su celular.
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-3">
        <Input
          label="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
        />
        <Input
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          hint="Mínimo 8 caracteres, fácil de recordar para él."
        />
        <Input
          label="Repetí la contraseña"
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          autoComplete="new-password"
        />
        {error && (
          <p
            role="alert"
            className="rounded-[12px] bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
          >
            {error}
          </p>
        )}
        <Button type="submit" disabled={mutation.isPending || !online}>
          {mutation.isPending ? 'Creando…' : 'Crear cuenta'}
        </Button>
      </form>
    </Card>
  );
}

function ResetPassword({ player, username }: { player: Player; username: string | null }) {
  const online = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => familyApi.resetPlayerPassword(password),
    onSuccess: () => {
      setOpen(false);
      setDone(true);
      setPassword('');
      setPassword2('');
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password.length < MIN_PASSWORD) return setLocalError(`Mínimo ${MIN_PASSWORD} caracteres.`);
    if (password !== password2) return setLocalError('Las contraseñas no coinciden.');
    mutation.mutate();
  };

  const error = localError ?? (mutation.isError ? errorText(mutation.error) : null);

  return (
    <>
      <Card padded={false}>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setOpen(true);
          }}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-sand/60"
        >
          <KeyRound className="size-5 text-gold-strong" aria-hidden />
          <span className="flex-1">
            <span className="block font-medium">Cambiar contraseña de {player.first_name}</span>
            <span className="block text-xs text-muted">
              {done
                ? '✓ Contraseña actualizada'
                : username
                  ? `Usuario: ${username}`
                  : 'Cuenta del jugador'}
            </span>
          </span>
        </button>
      </Card>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Nueva contraseña de ${player.first_name}`}
        footer={
          <Button
            type="submit"
            form="reset-password-form"
            block
            disabled={mutation.isPending || !online}
          >
            {mutation.isPending ? 'Guardando…' : 'Guardar contraseña'}
          </Button>
        }
      >
        <form
          id="reset-password-form"
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-3"
        >
          <Input
            label="Nueva contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            label="Repetí la contraseña"
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
          />
          {error && (
            <p
              role="alert"
              className="rounded-[12px] bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            >
              {error}
            </p>
          )}
        </form>
      </Sheet>
    </>
  );
}
