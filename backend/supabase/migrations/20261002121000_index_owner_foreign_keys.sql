-- Cover the composite (device_id, user_id) foreign keys.
drop index public.documents_device_idx;
create index documents_device_user_idx on public.documents (device_id, user_id) where device_id is not null;
create index reminders_device_user_idx on public.reminders (device_id, user_id);
