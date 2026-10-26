-- Tarife: how many devices a user may keep.
--   trial: free, up to 50 devices (everyone without a row)
--   plus:  up to 125 devices
--   pro:   up to 1000 devices
-- Rows are written only by the server (store purchases); users can read their own.
-- Wertsachen in the Tresor do not count.
create table public.user_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('trial', 'plus', 'pro')),
  -- null: no end date
  valid_until timestamptz,
  updated_at timestamptz not null default now()
);

grant select on public.user_plans to authenticated;
grant all on public.user_plans to service_role;
alter table public.user_plans enable row level security;

create policy "user_plans: owner select" on public.user_plans for select to authenticated
  using (user_id = (select auth.uid()));

-- The plan in force: an expired plan falls back to the trial.
create or replace function private.current_plan(uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.plan from public.user_plans p
     where p.user_id = uid and (p.valid_until is null or p.valid_until > now())),
    'trial');
$$;

create or replace function private.device_limit(plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case plan when 'pro' then 1000 when 'plus' then 125 else 50 end;
$$;

-- Plan, limit and usage of the signed-in user, for the app.
create or replace function public.my_plan()
returns table (plan text, device_limit integer, devices_used integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.plan, private.device_limit(p.plan),
         (select count(*)::integer from public.devices d where d.user_id = auth.uid())
  from (select private.current_plan(auth.uid()) as plan) p
  where auth.uid() is not null;
$$;
revoke all on function public.my_plan() from public;
grant execute on function public.my_plan() to authenticated;

-- Enforced in the database, so direct PostgREST inserts cannot get around it either.
create or replace function private.enforce_device_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serialises concurrent inserts of the same user, so the count cannot be raced.
  perform pg_advisory_xact_lock(hashtext('device_limit:' || new.user_id::text));
  if (select count(*) from public.devices d where d.user_id = new.user_id)
     >= private.device_limit(private.current_plan(new.user_id)) then
    raise exception 'device_limit_reached' using errcode = 'P0001', hint = 'Upgrade the plan to add more devices';
  end if;
  return new;
end;
$$;

create trigger devices_enforce_limit before insert on public.devices
  for each row execute function private.enforce_device_limit();
