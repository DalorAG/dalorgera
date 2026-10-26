-- Fixes from the audit of 26.10.2026.

-- ---------------------------------------------------------------------------
-- Reminders: a rebuild must never re-send a reminder that already went out, and the same day
-- picked twice must not break the upsert ("cannot affect row a second time").
-- ---------------------------------------------------------------------------
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
  cross join lateral (
    select distinct x from unnest(case when d.kind = 'burden_of_proof' then '{30}'::smallint[] else days end) as x
  ) as o (days)
  where d.enabled and d.due - o.days >= current_date
  on conflict (device_id, kind, days_before) do update
    set due_date = excluded.due_date, remind_at = excluded.remind_at, sent_at = null
    -- Only a changed deadline (new purchase date, other warranty) makes a sent reminder due again.
    where public.reminders.due_date is distinct from excluded.due_date;
end;
$$;
revoke all on function private.schedule_reminders(public.devices) from public, anon, authenticated;
revoke all on function private.reschedule_user_reminders() from public, anon, authenticated;

-- Rebuild only when the schedule really changed, not on every save.
drop trigger reminder_settings_reschedule on public.reminder_settings;
create trigger reminder_settings_reschedule_insert after insert on public.reminder_settings
  for each row execute function private.reschedule_user_reminders();
create trigger reminder_settings_reschedule_update after update on public.reminder_settings
  for each row
  when (old.days_before is distinct from new.days_before or old.hour is distinct from new.hour)
  execute function private.reschedule_user_reminders();

-- ---------------------------------------------------------------------------
-- Grants like the older tables: nothing for anon, only what the policies need.
-- ---------------------------------------------------------------------------
revoke all on public.reminder_settings, public.user_plans from anon, authenticated;
grant select, insert, update on public.reminder_settings to authenticated;
grant select on public.user_plans to authenticated;
revoke all on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated;
revoke all on function private.current_plan(uuid) from public, anon, authenticated;
revoke all on function private.enforce_device_limit() from public, anon, authenticated;

alter table public.luxury_items
  add constraint luxury_items_photo_order_size check (cardinality(photo_order) <= 50);

-- ---------------------------------------------------------------------------
-- One Beleg for several devices, e.g. 20 laptops on one invoice: every device keeps a link to it.
-- ---------------------------------------------------------------------------
alter table public.devices
  add column source_document_id uuid,
  add constraint devices_source_document_fkey foreign key (source_document_id, user_id)
    references public.documents (id, user_id) on delete set null (source_document_id);
create index devices_source_document_idx on public.devices (source_document_id) where source_document_id is not null;

-- ---------------------------------------------------------------------------
-- Daily quota for the paid AI calls (OpenAI), per user and kind.
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  kind text not null check (kind in ('recognize', 'identify', 'market_value')),
  calls integer not null default 0,
  primary key (user_id, day, kind)
);
revoke all on public.ai_usage from anon, authenticated;
grant all on public.ai_usage to service_role;
alter table public.ai_usage enable row level security;

-- Counts one call for the signed-in user; false once today's limit is used up.
-- Anonymous accounts get a much smaller budget.
create or replace function public.consume_ai_quota(call_kind text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  anonymous boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  max_calls integer;
  used integer;
begin
  if uid is null then
    return false;
  end if;
  max_calls := case call_kind
    when 'recognize' then 100
    when 'identify' then 60
    when 'market_value' then 10
  end;
  if max_calls is null then
    raise exception 'unknown AI call kind %', call_kind using errcode = '22023';
  end if;
  if anonymous then
    max_calls := greatest(1, max_calls / 10);
  end if;

  insert into public.ai_usage (user_id, day, kind, calls)
  values (uid, current_date, call_kind, 1)
  on conflict (user_id, day, kind) do update set calls = public.ai_usage.calls + 1
  returning calls into used;
  return used <= max_calls;
end;
$$;
revoke all on function public.consume_ai_quota(text) from public, anon;
grant execute on function public.consume_ai_quota(text) to authenticated;
