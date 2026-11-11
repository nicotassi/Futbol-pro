-- =============================================================================
-- FUTBOLISTA PRO · 0700 · Storage privado
-- =============================================================================
-- Rutas: <player_id>/<...>. Ningún bucket es público; la app accede con URLs
-- firmadas de corta duración.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('watch-screenshots', 'watch-screenshots', false, 10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'image/heic']),
  ('player-media', 'player-media', false, 52428800,
    array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Primer segmento de la ruta como player_id (NULL si no es un UUID válido).
create or replace function private.path_player_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  first_segment text := split_part(p_name, '/', 1);
begin
  if first_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return first_segment::uuid;
  end if;
  return null;
end;
$$;
grant execute on function private.path_player_id(text) to authenticated, service_role;

-- watch-screenshots: papá sube y administra; ambos pueden ver.
create policy watch_screenshots_select on storage.objects for select to authenticated
  using (bucket_id = 'watch-screenshots' and private.is_member(private.path_player_id(name)));
create policy watch_screenshots_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'watch-screenshots' and private.is_admin(private.path_player_id(name)));
create policy watch_screenshots_update on storage.objects for update to authenticated
  using (bucket_id = 'watch-screenshots' and private.is_admin(private.path_player_id(name)))
  with check (bucket_id = 'watch-screenshots' and private.is_admin(private.path_player_id(name)));
create policy watch_screenshots_delete on storage.objects for delete to authenticated
  using (bucket_id = 'watch-screenshots' and private.is_admin(private.path_player_id(name)));

-- player-media (avatar, "mi mejor jugada"): ambos suben; borra papá o quien lo subió.
create policy player_media_select on storage.objects for select to authenticated
  using (bucket_id = 'player-media' and private.is_member(private.path_player_id(name)));
create policy player_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'player-media' and private.is_member(private.path_player_id(name)));
create policy player_media_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'player-media'
    and (
      private.is_admin(private.path_player_id(name))
      or (owner_id = (select auth.uid())::text and private.is_member(private.path_player_id(name)))
    )
  );
