
create table if not exists public.profiles (
  id uuid primary key,
  display_name text not null default '' check (char_length(display_name) <= 60),
  avatar_path text,
  birthdate date,
  pronouns text check (char_length(pronouns) <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique,
  created_by uuid not null,
  started_on date,
  created_at timestamptz not null default now()
);
grant select on public.couples to authenticated;
grant all on public.couples to service_role;
alter table public.couples enable row level security;

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null unique,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);
grant select on public.couple_members to authenticated;
grant all on public.couple_members to service_role;
alter table public.couple_members enable row level security;

create or replace function public.my_couple_id()
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from public.couple_members where user_id = auth.uid()
$$;

create or replace function public.is_partner(_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.couple_members a join public.couple_members b on a.couple_id = b.couple_id
    where a.user_id = auth.uid() and b.user_id = _other and b.user_id <> a.user_id
  )
$$;

drop policy if exists "own or partner profile" on public.profiles;
create policy "own or partner profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_partner(id));
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "view own couple" on public.couples;
create policy "view own couple" on public.couples for select to authenticated using (id = public.my_couple_id());
drop policy if exists "view own couple members" on public.couple_members;
create policy "view own couple members" on public.couple_members for select to authenticated using (couple_id = public.my_couple_id());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create or replace function public.create_couple()
returns text language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); _cid uuid; _code text;
begin
  if _uid is null then raise exception 'not_authenticated'; end if;
  select couple_id into _cid from couple_members where user_id = _uid;
  if _cid is not null then
    if (select count(*) from couple_members where couple_id = _cid) >= 2 then raise exception 'already_linked'; end if;
    select invite_code into _code from couples where id = _cid;
    return _code;
  end if;
  loop
    _code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from couples where invite_code = _code);
  end loop;
  insert into couples (invite_code, created_by) values (_code, _uid) returning id into _cid;
  insert into couple_members (couple_id, user_id) values (_cid, _uid);
  return _code;
end $$;

create or replace function public.preview_invite(_code text)
returns text language plpgsql security definer set search_path = public as $$
declare _cid uuid; _name text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select id into _cid from couples where invite_code = upper(trim(_code));
  if _cid is null then raise exception 'invalid_code'; end if;
  if exists (select 1 from couple_members where couple_id = _cid and user_id = auth.uid()) then raise exception 'own_code'; end if;
  if (select count(*) from couple_members where couple_id = _cid) >= 2 then raise exception 'couple_full'; end if;
  select p.display_name into _name from couple_members m join profiles p on p.id = m.user_id where m.couple_id = _cid limit 1;
  return _name;
end $$;

create or replace function public.join_couple(_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); _cid uuid; _old uuid;
begin
  if _uid is null then raise exception 'not_authenticated'; end if;
  select id into _cid from couples where invite_code = upper(trim(_code)) for update;
  if _cid is null then raise exception 'invalid_code'; end if;
  if exists (select 1 from couple_members where couple_id = _cid and user_id = _uid) then raise exception 'own_code'; end if;
  if (select count(*) from couple_members where couple_id = _cid) >= 2 then raise exception 'couple_full'; end if;
  select couple_id into _old from couple_members where user_id = _uid;
  if _old is not null then
    if (select count(*) from couple_members where couple_id = _old) >= 2 then raise exception 'already_linked'; end if;
    delete from couples where id = _old;
  end if;
  insert into couple_members (couple_id, user_id) values (_cid, _uid);
  update couples set invite_code = null where id = _cid;
  return _cid;
end $$;

create or replace function public.leave_couple()
returns void language plpgsql security definer set search_path = public as $$
declare _cid uuid;
begin
  select couple_id into _cid from couple_members where user_id = auth.uid();
  if _cid is null then return; end if;
  delete from couples where id = _cid;
end $$;

revoke execute on function public.create_couple(), public.preview_invite(text), public.join_couple(text), public.leave_couple(), public.my_couple_id(), public.is_partner(uuid) from public, anon;
grant execute on function public.create_couple(), public.preview_invite(text), public.join_couple(text), public.leave_couple(), public.my_couple_id(), public.is_partner(uuid) to authenticated;

drop policy if exists "avatar read own or partner" on storage.objects;
create policy "avatar read own or partner" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_partner(((storage.foldername(name))[1])::uuid)));
drop policy if exists "avatar write own" on storage.objects;
create policy "avatar write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatar update own" on storage.objects;
create policy "avatar update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatar delete own" on storage.objects;
create policy "avatar delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
