
create table if not exists public.couple_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  event_type text not null default 'plan'
    check (event_type in ('appointment', 'study', 'work', 'birthday', 'anniversary', 'trip', 'plan', 'other')),
  starts_on date not null,
  start_time time,
  end_time time,
  all_day boolean not null default false,
  location text check (char_length(location) <= 160),
  notes text check (char_length(notes) <= 1000),
  reminder_minutes integer check (reminder_minutes in (null, 0, 10, 30, 60, 1440)),
  recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists couple_events_couple_date_idx on public.couple_events (couple_id, starts_on);

grant select, insert, update, delete on public.couple_events to authenticated;
grant all on public.couple_events to service_role;
alter table public.couple_events enable row level security;

drop policy if exists "couple members view events" on public.couple_events;
create policy "couple members view events" on public.couple_events
  for select to authenticated
  using (couple_id = public.my_couple_id());

drop policy if exists "couple members create events" on public.couple_events;
create policy "couple members create events" on public.couple_events
  for insert to authenticated
  with check (
    couple_id = public.my_couple_id()
    and created_by = auth.uid()
    and (owner_id is null or public.is_partner(owner_id) or owner_id = auth.uid())
  );

drop policy if exists "couple members update events" on public.couple_events;
create policy "couple members update events" on public.couple_events
  for update to authenticated
  using (couple_id = public.my_couple_id())
  with check (
    couple_id = public.my_couple_id()
    and (owner_id is null or public.is_partner(owner_id) or owner_id = auth.uid())
  );

drop policy if exists "couple members delete events" on public.couple_events;
create policy "couple members delete events" on public.couple_events
  for delete to authenticated
  using (couple_id = public.my_couple_id());

drop trigger if exists couple_events_touch on public.couple_events;
create trigger couple_events_touch before update on public.couple_events
  for each row execute function public.touch_updated_at();
