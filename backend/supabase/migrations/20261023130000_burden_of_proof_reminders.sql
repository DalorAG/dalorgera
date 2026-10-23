-- Beweislastumkehr (AT: § 11 VGG, DE: § 477 BGB): in the first year after the purchase the
-- seller has to prove that a defect was not there at delivery; afterwards the buyer has to.
-- One reminder 30 days before the first year ends, so defects are reported to the seller in time.
alter type public.reminder_kind add value if not exists 'burden_of_proof';

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
               ('burden_of_proof'::public.reminder_kind, (new.purchase_date + interval '1 year')::date,
                new.kind in ('statutory', 'warranty')),
               ('maintenance'::public.reminder_kind, new.protected_until,
                new.kind = 'maintenance'),
               ('vignette'::public.reminder_kind, new.protected_until,
                new.kind = 'vignette')) as d (kind, due, enabled)
  cross join (values (30), (7)) as o (days)
  where d.enabled and d.due - o.days >= current_date
    and (d.kind::text <> 'burden_of_proof' or o.days = 30)
  on conflict (device_id, kind, days_before) do update
    set due_date = excluded.due_date, remind_at = excluded.remind_at, sent_at = null;

  return null;
end;
$$;
