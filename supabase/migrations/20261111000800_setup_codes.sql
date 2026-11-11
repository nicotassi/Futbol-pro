-- =============================================================================
-- FUTBOLISTA PRO · 0800 · Configuración inicial desde la app
-- =============================================================================
-- La primera cuenta (papá) se crea desde la app con un CÓDIGO DE INSTALACIÓN de
-- un solo uso. Así no hace falta abrir el registro público: sin el código
-- nadie puede crear cuentas, y una vez usado deja de servir.
-- Solo la Edge Function "family-accounts" (service_role) accede a esto.
-- =============================================================================

create table public.setup_codes (
  code_hash  text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at    timestamptz
);
alter table public.setup_codes enable row level security;
revoke all on public.setup_codes from anon, authenticated;
comment on table public.setup_codes is 'Códigos de instalación de un solo uso (se guarda solo su hash SHA-256).';

-- Consume un código de forma atómica. true si era válido.
create or replace function public.consume_setup_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  update public.setup_codes
     set used_at = now()
   where code_hash = encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex')
     and used_at is null
     and expires_at > now();
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

-- Devuelve un código a "sin usar" si la instalación falló a mitad de camino.
create or replace function public.release_setup_code(p_code text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.setup_codes
     set used_at = null
   where code_hash = encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex');
$$;

revoke all on function public.consume_setup_code(text), public.release_setup_code(text) from public, anon, authenticated;
grant execute on function public.consume_setup_code(text), public.release_setup_code(text) to service_role;

-- Genera un código nuevo (lo ejecuta el administrador desde el SQL Editor o Claude).
-- Devuelve el código en texto claro UNA vez; en la base queda solo el hash.
create or replace function private.new_setup_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- sin 0/O ni 1/I/L
  code text := '';
  i int;
begin
  for i in 1..8 loop
    code := code || substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(alphabet)), 1);
  end loop;
  code := substr(code, 1, 4) || '-' || substr(code, 5, 4);
  insert into public.setup_codes (code_hash) values (encode(extensions.digest(code, 'sha256'), 'hex'));
  return code;
end;
$$;
revoke all on function private.new_setup_code() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Registro cerrado: solo se aceptan cuentas creadas por la Edge Function
-- "family-accounts" (que marca app_metadata.fp_invited). Un registro público
-- desde la API es rechazado por la base aunque esté habilitado en Auth.
-- app_metadata solo lo puede escribir el servidor (clave secreta).
-- -----------------------------------------------------------------------------
create or replace function private.reject_uninvited_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'fp_invited', '') <> 'true' then
    raise exception 'Registro cerrado: las cuentas se crean desde la app.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger reject_uninvited_signup
  before insert on auth.users
  for each row execute function private.reject_uninvited_signup();
