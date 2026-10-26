-- When to remind: the user picks the days before a deadline and the hour (Europe/Berlin).
-- Without a row the old schedule applies: 30 and 7 days before, at 09:00.
create table public.reminder_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  days_before smallint[] not null default '{30,7}'
    check (cardinality(days_before) between 1 and 7 and days_before <@ '{90,60,30,14,7,3,1}'::smallint[]),
  hour smallint not null default 9 check (hour between 6 and 22),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.reminder_settings to authenticated;
grant all on public.reminder_settings to service_role;
alter table public.reminder_settings enable row level security;

create policy "reminder_settings: owner select" on public.reminder_settings for select to authenticated
  using (user_id = (select auth.uid()));
create policy "reminder_settings: owner insert" on public.reminder_settings for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "reminder_settings: owner update" on public.reminder_settings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- The schedule for one device, so a settings change can rebuild every device of the user.
-- The Beweislast reminder stays a single one 30 days before, whatever the user picked.
create or replace function private.schedule_reminders(dev public.devices)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  days smallint[];
  at_hour smallint;
begin
  select s.days_before, s.hour into days, at_hour from public.reminder_settings s where s.user_id = dev.user_id;
  days := coalesce(days, '{30,7}');
  at_hour := coalesce(at_hour, 9);

  delete from public.reminders where device_id = dev.id and sent_at is null;

  insert into public.reminders (user_id, device_id, kind, days_before, due_date, remind_at)
  select dev.user_id, dev.id, d.kind, o.days, d.due,
         ((d.due - o.days) + make_time(at_hour, 0, 0)) at time zone 'Europe/Berlin'
  from (values ('warranty'::public.reminder_kind, dev.warranty_until,
                dev.kind = 'warranty' and dev.warranty_months > 0),
               ('statutory'::public.reminder_kind, dev.statutory_until,
                dev.kind in ('statutory', 'warranty')
                and not (dev.warranty_months > 0 and dev.warranty_until = dev.statutory_until)),
               ('burden_of_proof'::public.reminder_kind, (dev.purchase_date + interval '1 year')::date,
                dev.kind in ('statutory', 'warranty')),
               ('maintenance'::public.reminder_kind, dev.protected_until,
                dev.kind = 'maintenance'),
               ('vignette'::public.reminder_kind, dev.protected_until,
                dev.kind = 'vignette')) as d (kind, due, enabled)
  cross join lateral unnest(case when d.kind = 'burden_of_proof' then '{30}'::smallint[] else days end) as o (days)
  where d.enabled and d.due - o.days >= current_date
  on conflict (device_id, kind, days_before) do update
    set due_date = excluded.due_date, remind_at = excluded.remind_at, sent_at = null;
end;
$$;
revoke all on function private.schedule_reminders(public.devices) from public;

create or replace function private.schedule_device_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.schedule_reminders(new);
  return null;
end;
$$;

create or replace function private.reschedule_user_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.schedule_reminders(d) from public.devices d where d.user_id = new.user_id;
  return null;
end;
$$;

create trigger reminder_settings_reschedule after insert or update on public.reminder_settings
  for each row execute function private.reschedule_user_reminders();
