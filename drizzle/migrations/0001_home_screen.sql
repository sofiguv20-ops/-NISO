
alter table public.couples add column started_on date;

create table public.user_status (
  user_id uuid primary key,
  mood text check (char_length(mood) <= 30),
  activity text check (char_length(activity) <= 60),
  custom_status text check (char_length(custom_status) <= 120),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.user_status to authenticated;
grant all on public.user_status to service_role;
alter table public.user_status enable row level security;
create policy "own status select" on public.user_status for select to authenticated using (user_id = auth.uid());
create policy "own status insert" on public.user_status for insert to authenticated with check (user_id = auth.uid());
create policy "own status update" on public.user_status for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger user_status_touch before update on public.user_status for each row execute function public.touch_updated_at();

create table public.user_settings (
  user_id uuid primary key,
  share_mood boolean not null default true,
  share_activity boolean not null default true,
  share_custom_status boolean not null default true,
  share_cycle_phase boolean not null default false,
  share_location boolean not null default false,
  hidden_home_cards text[] not null default '{}',
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.user_settings to authenticated;
grant all on public.user_settings to service_role;
alter table public.user_settings enable row level security;
create policy "own settings select" on public.user_settings for select to authenticated using (user_id = auth.uid());
create policy "own settings insert" on public.user_settings for insert to authenticated with check (user_id = auth.uid());
create policy "own settings update" on public.user_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger user_settings_touch before update on public.user_settings for each row execute function public.touch_updated_at();

-- Partner's status, only the fields they chose to share
create or replace function public.get_partner_status()
returns table (mood text, activity text, custom_status text, updated_at timestamptz, shares_cycle boolean, shares_location boolean)
language sql stable security definer set search_path = public as $$
  select
    case when coalesce(s.share_mood, true) then st.mood end,
    case when coalesce(s.share_activity, true) then st.activity end,
    case when coalesce(s.share_custom_status, true) then st.custom_status end,
    st.updated_at,
    coalesce(s.share_cycle_phase, false),
    coalesce(s.share_location, false)
  from public.couple_members me
  join public.couple_members p on p.couple_id = me.couple_id and p.user_id <> me.user_id
  left join public.user_status st on st.user_id = p.user_id
  left join public.user_settings s on s.user_id = p.user_id
  where me.user_id = auth.uid()
$$;

create or replace function public.set_couple_start(_date date)
returns void language plpgsql security definer set search_path = public as $$
begin
  if _date is not null and _date > current_date then raise exception 'future_date'; end if;
  update public.couples set started_on = _date where id = public.my_couple_id();
end $$;

revoke execute on function public.get_partner_status(), public.set_couple_start(date) from public, anon;
grant execute on function public.get_partner_status(), public.set_couple_start(date) to authenticated;
