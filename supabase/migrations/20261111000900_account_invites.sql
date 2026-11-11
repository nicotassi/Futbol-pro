-- =============================================================================
-- FUTBOLISTA PRO · 0900 · Registro cerrado con invitaciones
-- =============================================================================
-- Reemplaza el control por app_metadata (Supabase Auth guarda los metadatos
-- después de insertar el usuario, así que no sirven para decidir en el INSERT).
--
-- Ahora la Edge Function "family-accounts" anota el email en account_invites
-- justo antes de crear la cuenta. La base solo acepta usuarios cuyo email
-- tenga una invitación vigente (2 minutos) y la consume al usarla.
-- Cualquier registro público desde la API es rechazado.
-- =============================================================================

create table public.account_invites (
  email      text primary key check (email = lower(email)),
  expires_at timestamptz not null default now() + interval '2 minutes'
);
alter table public.account_invites enable row level security;
revoke all on public.account_invites from anon, authenticated;
grant all on public.account_invites to service_role;
comment on table public.account_invites is 'Emails autorizados a crear cuenta (los anota la Edge Function family-accounts; duran 2 minutos).';

create or replace function private.reject_uninvited_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.account_invites
   where email = lower(new.email)
     and expires_at > now();
  if not found then
    raise exception 'Registro cerrado: las cuentas se crean desde la app.' using errcode = '42501';
  end if;
  return new;
end;
$$;
