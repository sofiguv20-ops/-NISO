
create or replace function public.update_updated_at_column() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_path text, birthdate date, pronouns text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique, started_on date, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(), primary key (couple_id, user_id));
create table public.couple_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  event_type text not null default 'other', starts_on date not null, start_time time, end_time time,
  all_day boolean not null default false, location text, notes text, reminder_minutes int,
  recurrence text not null default 'none',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.cycle_days (
  user_id uuid not null references auth.users(id) on delete cascade, day date not null,
  flow text, pain int, mood text, energy int, sleep_hours numeric, symptoms text[] not null default '{}', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_id, day));
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  share_mood boolean not null default true, share_activity boolean not null default true, share_custom_status boolean not null default true,
  share_cycle_phase boolean not null default false, share_cycle_dates boolean not null default false, share_cycle_symptoms boolean not null default false,
  share_location boolean not null default false, hidden_home_cards text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.user_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mood text, activity text, custom_status text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.user_locations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  latitude double precision not null, longitude double precision not null, accuracy double precision,
  updated_at timestamptz not null default now());

grant select, insert, update on public.profiles to authenticated;
grant select on public.couples, public.couple_members to authenticated;
grant select, insert, update, delete on public.couple_events, public.cycle_days, public.user_settings, public.user_status, public.user_locations to authenticated;
grant all on public.profiles, public.couples, public.couple_members, public.couple_events, public.cycle_days, public.user_settings, public.user_status, public.user_locations to service_role;

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.couple_events enable row level security;
alter table public.cycle_days enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_status enable row level security;
alter table public.user_locations enable row level security;

create or replace function public.my_couple_id() returns uuid language sql stable security definer set search_path=public as $$
  select couple_id from couple_members where user_id = auth.uid() $$;
create or replace function public.is_partner(_other uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from couple_members a join couple_members b on a.couple_id=b.couple_id
    where a.user_id=auth.uid() and b.user_id=_other and b.user_id<>a.user_id) $$;

create policy "own or partner profile" on public.profiles for select to authenticated using (id=auth.uid() or public.is_partner(id));
create policy "insert own profile" on public.profiles for insert to authenticated with check (id=auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "my couple" on public.couples for select to authenticated using (id=public.my_couple_id());
create policy "my couple members" on public.couple_members for select to authenticated using (couple_id=public.my_couple_id());
create policy "couple events read" on public.couple_events for select to authenticated using (couple_id=public.my_couple_id());
create policy "couple events insert" on public.couple_events for insert to authenticated with check (couple_id=public.my_couple_id() and created_by=auth.uid() and (owner_id is null or owner_id=auth.uid() or public.is_partner(owner_id)));
create policy "couple events update" on public.couple_events for update to authenticated using (couple_id=public.my_couple_id()) with check (couple_id=public.my_couple_id() and (owner_id is null or owner_id=auth.uid() or public.is_partner(owner_id)));
create policy "couple events delete" on public.couple_events for delete to authenticated using (couple_id=public.my_couple_id());
create policy "own cycle" on public.cycle_days for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "own settings" on public.user_settings for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "own status" on public.user_status for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "own location" on public.user_locations for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

create trigger t_profiles before update on public.profiles for each row execute function public.update_updated_at_column();
create trigger t_couples before update on public.couples for each row execute function public.update_updated_at_column();
create trigger t_events before update on public.couple_events for each row execute function public.update_updated_at_column();
create trigger t_cycle before update on public.cycle_days for each row execute function public.update_updated_at_column();
create trigger t_settings before update on public.user_settings for each row execute function public.update_updated_at_column();
create trigger t_status before update on public.user_status for each row execute function public.update_updated_at_column();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id, display_name) values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)));
  insert into user_settings(user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.create_couple() returns text language plpgsql security definer set search_path=public as $$
declare c text; cid uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select co.invite_code into c from couple_members m join couples co on co.id=m.couple_id where m.user_id=auth.uid();
  if c is not null then return c; end if;
  loop
    c := upper(substr(translate(encode(gen_random_bytes(8),'base64'),'+/=0O1IL','XYZ23456'),1,6));
    exit when not exists(select 1 from couples where invite_code=c);
  end loop;
  insert into couples(invite_code, created_by) values (c, auth.uid()) returning id into cid;
  insert into couple_members(couple_id,user_id) values (cid, auth.uid());
  return c;
end $$;

create or replace function public.preview_invite(_code text) returns text language plpgsql stable security definer set search_path=public as $$
declare cid uuid; n int; owner uuid; nm text;
begin
  select id into cid from couples where invite_code=upper(trim(_code));
  if cid is null then raise exception 'invalid_code'; end if;
  select count(*), min(user_id::text)::uuid into n, owner from couple_members where couple_id=cid;
  if owner=auth.uid() then raise exception 'own_code'; end if;
  if n>=2 then raise exception 'couple_full'; end if;
  select display_name into nm from profiles where id=owner;
  return nm;
end $$;

create or replace function public.join_couple(_code text) returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid; n int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select id into cid from couples where invite_code=upper(trim(_code)) for update;
  if cid is null then raise exception 'invalid_code'; end if;
  if exists(select 1 from couple_members where couple_id=cid and user_id=auth.uid()) then raise exception 'own_code'; end if;
  if exists(select 1 from couple_members where user_id=auth.uid()) then
    -- allow leaving an empty solo couple automatically
    if exists(select 1 from couple_members m where m.user_id=auth.uid() and (select count(*) from couple_members x where x.couple_id=m.couple_id)=1) then
      delete from couples where id=(select couple_id from couple_members where user_id=auth.uid());
    else raise exception 'already_linked'; end if;
  end if;
  select count(*) into n from couple_members where couple_id=cid;
  if n>=2 then raise exception 'couple_full'; end if;
  insert into couple_members(couple_id,user_id) values (cid, auth.uid());
  return cid;
end $$;

create or replace function public.leave_couple() returns void language plpgsql security definer set search_path=public as $$
declare cid uuid;
begin
  select couple_id into cid from couple_members where user_id=auth.uid();
  if cid is null then return; end if;
  delete from couples where id=cid;
end $$;

create or replace function public.set_couple_start(_date date) returns void language plpgsql security definer set search_path=public as $$
begin
  if _date > current_date then raise exception 'future_date'; end if;
  update couples set started_on=_date where id=public.my_couple_id();
end $$;

create or replace function public.partner_id() returns uuid language sql stable security definer set search_path=public as $$
  select b.user_id from couple_members a join couple_members b on a.couple_id=b.couple_id and b.user_id<>a.user_id where a.user_id=auth.uid() $$;

create or replace function public.get_partner_status() returns table(mood text, activity text, custom_status text, updated_at timestamptz, shares_cycle boolean, shares_location boolean)
language sql stable security definer set search_path=public as $$
  select case when coalesce(s.share_mood,true) then st.mood end,
         case when coalesce(s.share_activity,true) then st.activity end,
         case when coalesce(s.share_custom_status,true) then st.custom_status end,
         st.updated_at,
         coalesce(s.share_cycle_dates or s.share_cycle_phase or s.share_cycle_symptoms,false),
         coalesce(s.share_location,false)
  from (select public.partner_id() as pid) p
  left join user_settings s on s.user_id=p.pid
  left join user_status st on st.user_id=p.pid
  where p.pid is not null $$;

create or replace function public.get_partner_location() returns table(latitude double precision, longitude double precision, accuracy double precision, updated_at timestamptz)
language sql stable security definer set search_path=public as $$
  select l.latitude,l.longitude,l.accuracy,l.updated_at from user_locations l join user_settings s on s.user_id=l.user_id
  where l.user_id=public.partner_id() and s.share_location $$;

create or replace function public.get_partner_cycle() returns table(shares_dates boolean, shares_symptoms boolean, last_period_start date, last_period_end date, recent_symptoms text[], recent_mood text, updated_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
declare pid uuid := public.partner_id(); s user_settings; e date; st date; d date; sy text[]; mo text; up timestamptz;
begin
  if pid is null then return; end if;
  select * into s from user_settings where user_id=pid;
  if s is null or not (s.share_cycle_dates or s.share_cycle_phase or s.share_cycle_symptoms) then return; end if;
  if s.share_cycle_dates or s.share_cycle_phase then
    select max(day) into e from cycle_days where user_id=pid and flow is not null;
    st := e;
    if e is not null then
      loop
        select max(day) into d from cycle_days where user_id=pid and flow is not null and day < st and day >= st-2;
        exit when d is null; st := d;
      end loop;
    end if;
  end if;
  if s.share_cycle_symptoms then
    select c.symptoms, c.mood into sy, mo from cycle_days c where c.user_id=pid and c.day >= current_date-3 order by c.day desc limit 1;
  end if;
  select max(c.updated_at) into up from cycle_days c where c.user_id=pid;
  return query select (s.share_cycle_dates or s.share_cycle_phase), s.share_cycle_symptoms, st, e, sy, mo, up;
end $$;

revoke execute on function public.create_couple(), public.preview_invite(text), public.join_couple(text), public.leave_couple(), public.set_couple_start(date), public.get_partner_status(), public.get_partner_location(), public.get_partner_cycle() from anon, public;
grant execute on function public.create_couple(), public.preview_invite(text), public.join_couple(text), public.leave_couple(), public.set_couple_start(date), public.get_partner_status(), public.get_partner_location(), public.get_partner_cycle(), public.my_couple_id(), public.is_partner(uuid), public.partner_id() to authenticated;

alter table public.couple_events replica identity full;
alter publication supabase_realtime add table public.couple_events, public.couples, public.couple_members, public.profiles, public.user_status, public.user_settings, public.user_locations, public.cycle_days;

create policy "avatar owner or partner read" on storage.objects for select to authenticated using (bucket_id='avatars' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_partner(((storage.foldername(name))[1])::uuid)));
create policy "avatar owner write" on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "avatar owner update" on storage.objects for update to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "avatar owner delete" on storage.objects for delete to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
