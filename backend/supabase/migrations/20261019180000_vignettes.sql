-- Autobahnvignette ("Autobahn-Pickerl"): valid for a fixed period, picked on "+".
-- purchase_date holds the first valid day, valid_until the last one
-- (the app computes it from the vignette type: Jahres-, 2-Monats-, 10-Tages-, 1-Tages-Vignette).
alter type public.device_kind add value if not exists 'vignette';
alter type public.reminder_kind add value if not exists 'vignette';

alter table public.devices
  add column valid_until date,
  add constraint devices_valid_until_check
    check ((kind::text = 'vignette') = (valid_until is not null) and (valid_until is null or valid_until >= purchase_date));

drop index public.devices_user_protected_idx;
alter table public.devices drop column protected_until;
alter table public.devices
  add column protected_until date generated always as (
    case
      -- valid_until is set exactly for vignettes (check above); the new enum
      -- value cannot be used in the transaction that adds it.
      when valid_until is not null then valid_until
      when kind = 'maintenance' then (purchase_date + make_interval(months => maintenance_interval_months))::date
      else greatest(
        (purchase_date + interval '2 years')::date,
        case when warranty_months > 0 then (purchase_date + make_interval(months => warranty_months))::date end
      )
    end
  ) stored;
create index devices_user_protected_idx on public.devices (user_id, protected_until);

create or replace function private.schedule_device_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.reminders where device_id = new.id and sent_at is null;

  insert into public.reminders (user_id, device_id, kind, days_before, due_date, remind_at)
  select new.user_id, new.id, d.kind, o.days, d.due,
         ((d.due - o.days) + time '09:00') at time zone 'Europe/Berlin'
  from (values ('warranty'::public.reminder_kind, new.warranty_until,
                new.kind = 'warranty' and new.warranty_months > 0),
               ('statutory'::public.reminder_kind, new.statutory_until,
                new.kind in ('statutory', 'warranty')
                and not (new.warranty_months > 0 and new.warranty_until = new.statutory_until)),
               ('maintenance'::public.reminder_kind, new.protected_until,
                new.kind = 'maintenance'),
               ('vignette'::public.reminder_kind, new.protected_until,
                new.kind = 'vignette')) as d (kind, due, enabled)
  cross join (values (30), (7)) as o (days)
  where d.enabled and d.due - o.days >= current_date
  on conflict (device_id, kind, days_before) do update
    set due_date = excluded.due_date, remind_at = excluded.remind_at, sent_at = null;

  return null;
end;
$$;

drop trigger devices_schedule_reminders_update on public.devices;
create trigger devices_schedule_reminders_update after update on public.devices
  for each row
  when (old.purchase_date is distinct from new.purchase_date
        or old.warranty_months is distinct from new.warranty_months
        or old.kind is distinct from new.kind
        or old.maintenance_interval_months is distinct from new.maintenance_interval_months
        or old.valid_until is distinct from new.valid_until)
  execute function private.schedule_device_reminders();
