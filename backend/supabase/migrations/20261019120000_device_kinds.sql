-- What the user tracks for a device, picked on "+":
--   statutory   = only the gesetzliche Gewährleistung (2 years)
--   warranty    = manufacturer Garantie (plus Gewährleistung)
--   maintenance = recurring Wartung, e.g. Pickerl; purchase_date holds the last service date
create type public.device_kind as enum ('statutory', 'warranty', 'maintenance');
alter type public.reminder_kind add value if not exists 'maintenance';

alter table public.devices
  add column kind public.device_kind not null default 'warranty',
  add column maintenance_interval_months smallint check (maintenance_interval_months between 1 and 120),
  add constraint devices_maintenance_interval_check
    check ((kind = 'maintenance') = (maintenance_interval_months is not null));

-- Existing devices without a manufacturer warranty only have Gewährleistung.
-- Runs before the reminder trigger below starts reacting to kind changes.
update public.devices set kind = 'statutory' where warranty_months = 0;

alter table public.devices
  add constraint devices_warranty_kind_check check (kind = 'warranty' or warranty_months = 0);

-- For Wartung the deadline is the next service, not the end of protection.
drop index public.devices_user_protected_idx;
alter table public.devices drop column protected_until;
alter table public.devices
  add column protected_until date generated always as (
    case
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
                new.kind <> 'maintenance'
                and not (new.warranty_months > 0 and new.warranty_until = new.statutory_until)),
               ('maintenance'::public.reminder_kind, new.protected_until,
                new.kind = 'maintenance')) as d (kind, due, enabled)
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
        or old.maintenance_interval_months is distinct from new.maintenance_interval_months)
  execute function private.schedule_device_reminders();
