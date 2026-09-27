
create or replace function public.i_answered(_couple uuid, _date date) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from daily_answers where user_id=auth.uid() and couple_id=_couple and question_date=_date) $$;
revoke execute on function public.i_answered(uuid,date) from anon, public;
grant execute on function public.i_answered(uuid,date) to authenticated;
drop policy "partner answers after mine" on public.daily_answers;
create policy "partner answers after mine" on public.daily_answers for select to authenticated
  using (couple_id=public.my_couple_id() and public.is_partner(user_id) and public.i_answered(couple_id, question_date));
