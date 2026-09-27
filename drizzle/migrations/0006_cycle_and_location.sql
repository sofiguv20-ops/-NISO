
-- Cycle tracking (personal data, shared only if the user opts in)
create table if not exists public.cycle_days (
  user_id uuid not null,
  day date not null,
  flow text check (flow in ('spotting','light','medium','heavy')),
  pain smallint check (pain between 0 and 5),
  mood text check (char_length(mood) <= 30),
  energy smallint check (energy between 0 and 5),
  sleep_hours numeric(3,1) check (sleep_hours >= 0 and sleep_hours <= 24),
  symptoms text[] not null default '{}',
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
grant select, insert, update, delete on public.cycle_days to authenticated;
grant all on public.cycle_days to service_role;
alter table public.cycle_days enable row level security;
drop policy if exists "own cycle select" on public.cycle_days;
create policy "own cycle select" on public.cycle_days for select to authenticated using (user_id = auth.uid());
drop policy if exists "own cycle insert" on public.cycle_days;
create policy "own cycle insert" on public.cycle_days for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "own cycle update" on public.cycle_days;
create policy "own cycle update" on public.cycle_days for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own cycle delete" on public.cycle_days;
create policy "own cycle delete" on public.cycle_days for delete to authenticated using (user_id = auth.uid());
drop trigger if exists cycle_days_touch on public.cycle_days;
create trigger cycle_days_touch before update on public.cycle_days for each row execute function public.touch_updated_at();

alter table public.user_settings add column if not exists share_cycle_dates boolean not null default false;
alter table public.user_settings add column if not exists share_cycle_symptoms boolean not null default false;
alter table public.user_settings add column if not exists cycle_tracking_enabled boolean not null default false;

-- Partner cycle view: only what the owner chose to share
create or replace function public.get_partner_cycle()
returns table (
  shares_dates boolean,
  shares_symptoms boolean,
  last_period_start date,
  last_period_end date,
  recent_symptoms text[],
  recent_mood text,
  updated_at timestamptz
)
language sql stable security definer set search_path = public as $$
  with partner as (
    select p.user_id
    from public.couple_members me
    join public.couple_members p on p.couple_id = me.couple_id and p.user_id <> me.user_id
    where me.user_id = auth.uid()
  ),
  s as (
    select coalesce(us.share_cycle_dates,false) as dates, coalesce(us.share_cycle_symptoms,false) as symptoms
    from partner join public.user_settings us on us.user_id = partner.user_id
  ),
  flows as (
    select d.day from public.cycle_days d join partner on partner.user_id = d.user_id
    where d.flow is not null order by d.day desc limit 40
  ),
  grouped as (
    select day, day - (row_number() over (order by day))::int as grp from flows
  ),
  last_period as (
    select min(day) as starts, max(day) as ends from grouped
    where grp = (select grp from grouped order by day desc limit 1)
  ),
  recent as (
    select d.symptoms, d.mood, d.updated_at
    from public.cycle_days d join partner on partner.user_id = d.user_id
    order by d.day desc limit 1
  )
  select
    coalesce((select dates from s), false),
    coalesce((select symptoms from s), false),
    case when (select dates from s) then (select starts from last_period) end,
    case when (select dates from s) then (select ends from last_period) end,
    case when (select symptoms from s) then (select symptoms from recent) end,
    case when (select symptoms from s) then (select mood from recent) end,
    (select updated_at from recent)
$$;
revoke execute on function public.get_partner_cycle() from public, anon;
grant execute on function public.get_partner_cycle() to authenticated;

-- Live location: one current point per user, no history
create table if not exists public.user_locations (
  user_id uuid primary key,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.user_locations to authenticated;
grant all on public.user_locations to service_role;
alter table public.user_locations enable row level security;
drop policy if exists "own location select" on public.user_locations;
create policy "own location select" on public.user_locations for select to authenticated using (user_id = auth.uid());
drop policy if exists "own location insert" on public.user_locations;
create policy "own location insert" on public.user_locations for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "own location update" on public.user_locations;
create policy "own location update" on public.user_locations for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own location delete" on public.user_locations;
create policy "own location delete" on public.user_locations for delete to authenticated using (user_id = auth.uid());
drop trigger if exists user_locations_touch on public.user_locations;
create trigger user_locations_touch before update on public.user_locations for each row execute function public.touch_updated_at();

create or replace function public.get_partner_location()
returns table (latitude double precision, longitude double precision, accuracy double precision, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select l.latitude, l.longitude, l.accuracy, l.updated_at
  from public.couple_members me
  join public.couple_members p on p.couple_id = me.couple_id and p.user_id <> me.user_id
  join public.user_settings s on s.user_id = p.user_id and s.share_location = true
  join public.user_locations l on l.user_id = p.user_id
  where me.user_id = auth.uid()
$$;
revoke execute on function public.get_partner_location() from public, anon;
grant execute on function public.get_partner_location() to authenticated;
