-- Existing devices still in their first year get the Beweislast reminder too.
-- Separate migration: the enum value added before cannot be used in the same transaction.
insert into public.reminders (user_id, device_id, kind, days_before, due_date, remind_at)
select d.user_id, d.id, 'burden_of_proof', 30, (d.purchase_date + interval '1 year')::date,
       (((d.purchase_date + interval '1 year')::date - 30) + time '09:00') at time zone 'Europe/Berlin'
from public.devices d
where d.kind in ('statutory', 'warranty')
  and (d.purchase_date + interval '1 year')::date - 30 >= current_date
on conflict (device_id, kind, days_before) do nothing;
