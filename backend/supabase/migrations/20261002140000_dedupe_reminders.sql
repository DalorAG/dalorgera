-- With a 24-month manufacturer warranty both deadlines fall on the same day.
-- Send one "Garantie" reminder instead of two identical notifications.
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
  from (values ('warranty'::public.reminder_kind, new.warranty_until, new.warranty_months > 0),
               ('statutory'::public.reminder_kind, new.statutory_until,
                not (new.warranty_months > 0 and new.warranty_until = new.statutory_until))) as d (kind, due, enabled)
  cross join (values (30), (7)) as o (days)
  where d.enabled and d.due - o.days >= current_date
  on conflict (device_id, kind, days_before) do update
    set due_date = excluded.due_date, remind_at = excluded.remind_at, sent_at = null;

  return null;
end;
$$;

delete from public.reminders r
using public.devices d
where r.device_id = d.id
  and r.kind = 'statutory'
  and r.sent_at is null
  and d.warranty_months > 0
  and d.warranty_until = d.statutory_until;
