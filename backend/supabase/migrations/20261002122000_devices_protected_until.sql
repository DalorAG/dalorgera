-- The later of the two deadlines: how long the device is protected at all.
-- Used for sorting and status filters (active / expiring / expired).
alter table public.devices
  add column protected_until date generated always as (
    greatest(
      (purchase_date + interval '2 years')::date,
      case when warranty_months > 0 then (purchase_date + make_interval(months => warranty_months))::date end
    )
  ) stored;

drop index public.devices_user_warranty_idx;
create index devices_user_protected_idx on public.devices (user_id, protected_until);
