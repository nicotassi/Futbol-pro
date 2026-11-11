import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { friendlyError } from '@/services/errors';
import { playerKeys, updatePlayer, type Player } from './api';
import { footLabels } from './format';
import { playerFormSchema, POSITIONS, type PlayerFormInput } from './playerSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  player: Player;
  userId: string;
}

const toForm = (p: Player): PlayerFormInput => ({
  first_name: p.first_name,
  last_name: p.last_name ?? '',
  birth_date: p.birth_date ?? '',
  position: p.position,
  dominant_foot: p.dominant_foot ?? '',
  club: p.club ?? '',
  category: p.category ?? '',
});

type FieldErrors = Partial<Record<keyof PlayerFormInput, string>>;

/** Edición del perfil del jugador (solo papá; la base de datos lo exige con RLS). */
export function PlayerEditSheet({ open, onClose, player, userId }: Props) {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const [form, setForm] = useState<PlayerFormInput>(() => toForm(player));
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: (patch: Parameters<typeof updatePlayer>[1]) => updatePlayer(player.id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: playerKeys.memberships(userId) });
      onClose();
    },
  });

  const set = <K extends keyof PlayerFormInput>(key: K, value: PlayerFormInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = playerFormSchema.safeParse(form);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof PlayerFormInput;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    mutation.mutate(parsed.data);
  };

  const close = () => {
    mutation.reset();
    setForm(toForm(player));
    setErrors({});
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Perfil del jugador"
      footer={
        <div className="flex flex-col gap-2">
          {mutation.isError && (
            <p
              role="alert"
              className="rounded-[12px] bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            >
              {friendlyError(mutation.error)}
            </p>
          )}
          {!online && (
            <p className="text-sm text-warning">Sin conexión: para guardar necesitás internet.</p>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" form="player-form" block disabled={mutation.isPending || !online}>
              {mutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="player-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Nombre"
            value={form.first_name}
            onChange={(e) => set('first_name', e.target.value)}
            error={errors.first_name}
            autoComplete="off"
          />
          <Input
            label="Apellido"
            value={form.last_name}
            onChange={(e) => set('last_name', e.target.value)}
            error={errors.last_name}
            hint="Opcional"
            autoComplete="off"
          />
        </div>
        <Input
          label="Fecha de nacimiento"
          type="date"
          value={form.birth_date}
          onChange={(e) => set('birth_date', e.target.value)}
          error={errors.birth_date}
          hint="Se usa solo para mostrar la edad."
        />
        <Select
          label="Posición"
          value={form.position}
          onChange={(e) => set('position', e.target.value)}
          error={errors.position}
        >
          {!POSITIONS.includes(form.position as (typeof POSITIONS)[number]) && (
            <option value={form.position}>{form.position}</option>
          )}
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select
          label="Pierna hábil"
          value={form.dominant_foot}
          onChange={(e) => set('dominant_foot', e.target.value as PlayerFormInput['dominant_foot'])}
        >
          <option value="">Sin especificar</option>
          {Object.entries(footLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Club"
            value={form.club}
            onChange={(e) => set('club', e.target.value)}
            error={errors.club}
            hint="Opcional"
          />
          <Input
            label="Categoría"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            error={errors.category}
            hint="Ej.: 2015"
          />
        </div>
      </form>
    </Sheet>
  );
}
