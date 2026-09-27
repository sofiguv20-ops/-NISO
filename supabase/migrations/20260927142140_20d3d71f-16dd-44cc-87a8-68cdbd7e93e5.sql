
alter table public.couples add column met_on date, add column song_title text, add column song_artist text, add column song_url text;

create or replace function public.update_our_space(_met_on date, _started_on date, _song_title text, _song_artist text, _song_url text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if public.my_couple_id() is null then raise exception 'no_couple'; end if;
  if _met_on > current_date or _started_on > current_date then raise exception 'future_date'; end if;
  update couples set met_on=_met_on, started_on=_started_on,
    song_title=left(nullif(trim(_song_title),''),120), song_artist=left(nullif(trim(_song_artist),''),120), song_url=left(nullif(trim(_song_url),''),500)
  where id=public.my_couple_id();
end $$;
revoke execute on function public.update_our_space(date,date,text,text,text) from anon, public;
grant execute on function public.update_our_space(date,date,text,text,text) to authenticated;

alter table public.user_settings
  add column share_checkins boolean not null default true,
  add column notify_kinds text[] not null default '{date,birthday,anniversary,event,plan,task,moment,custom}',
  add column notifications_enabled boolean not null default false,
  add column theme text not null default 'light';

create table public.space_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('photo','memory','place','date','message','for_when','wish','task','idea','reminder')),
  title text not null default '' check (char_length(title) <= 200),
  body text check (char_length(body) <= 5000),
  category text,
  item_date date,
  item_time time,
  place text,
  photo_path text,
  favorite boolean not null default false,
  done boolean not null default false,
  visibility text not null default 'shared' check (visibility in ('private','shared')),
  opened_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index on public.space_items (couple_id, kind);
grant select, insert, update, delete on public.space_items to authenticated;
grant all on public.space_items to service_role;
alter table public.space_items enable row level security;
create policy "read shared or own" on public.space_items for select to authenticated
  using (couple_id=public.my_couple_id() and (visibility='shared' or created_by=auth.uid()));
create policy "insert own" on public.space_items for insert to authenticated
  with check (couple_id=public.my_couple_id() and created_by=auth.uid());
create policy "update shared or own" on public.space_items for update to authenticated
  using (couple_id=public.my_couple_id() and (visibility='shared' or created_by=auth.uid()))
  with check (couple_id=public.my_couple_id() and (visibility='shared' or created_by=auth.uid()));
create policy "delete shared or own" on public.space_items for delete to authenticated
  using (couple_id=public.my_couple_id() and (visibility='shared' or created_by=auth.uid()));
create trigger t_space before update on public.space_items for each row execute function public.update_updated_at_column();

-- only author may change visibility
create or replace function public.guard_space_visibility() returns trigger language plpgsql set search_path=public as $$
begin
  if new.visibility <> old.visibility and old.created_by <> auth.uid() then raise exception 'only_author'; end if;
  new.created_by := old.created_by; new.couple_id := old.couple_id;
  return new;
end $$;
create trigger t_space_guard before update on public.space_items for each row execute function public.guard_space_visibility();

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood text not null, note text check (char_length(note) <= 500),
  shared boolean not null default true,
  created_at timestamptz not null default now());
create index on public.checkins (user_id, created_at desc);
grant select, insert, update, delete on public.checkins to authenticated;
grant all on public.checkins to service_role;
alter table public.checkins enable row level security;
create policy "own checkins" on public.checkins for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "partner shared checkins" on public.checkins for select to authenticated
  using (shared and public.is_partner(user_id) and exists(select 1 from user_settings s where s.user_id=checkins.user_id and s.share_checkins));

create table public.daily_answers (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_date date not null, question text not null,
  answer text not null check (char_length(answer) between 1 and 2000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, couple_id, question_date));
grant select, insert, update, delete on public.daily_answers to authenticated;
grant all on public.daily_answers to service_role;
alter table public.daily_answers enable row level security;
create policy "own answers" on public.daily_answers for all to authenticated
  using (user_id=auth.uid()) with check (user_id=auth.uid() and couple_id=public.my_couple_id());
create policy "partner answers after mine" on public.daily_answers for select to authenticated
  using (couple_id=public.my_couple_id() and public.is_partner(user_id)
    and exists(select 1 from daily_answers d where d.user_id=auth.uid() and d.couple_id=daily_answers.couple_id and d.question_date=daily_answers.question_date));
create trigger t_answers before update on public.daily_answers for each row execute function public.update_updated_at_column();

alter publication supabase_realtime add table public.space_items, public.checkins, public.daily_answers;

create policy "couple media read" on storage.objects for select to authenticated using (bucket_id='couple-media' and (storage.foldername(name))[1]=public.my_couple_id()::text);
create policy "couple media write" on storage.objects for insert to authenticated with check (bucket_id='couple-media' and (storage.foldername(name))[1]=public.my_couple_id()::text and (storage.foldername(name))[2]=auth.uid()::text);
create policy "couple media delete" on storage.objects for delete to authenticated using (bucket_id='couple-media' and (storage.foldername(name))[1]=public.my_couple_id()::text);
