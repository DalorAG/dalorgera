-- Garantie-Radar: initial schema
-- devices (with computed warranty / statutory deadlines), documents (photos of
-- receipts and warranty cards in Storage), reminders (queue), push_tokens.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.document_kind as enum ('receipt', 'warranty_card', 'invoice', 'other');
-- warranty = manufacturer Garantie, statutory = gesetzliche Gewährleistung (2 years in DE/EU)
create type public.reminder_kind as enum ('warranty', 'statutory');

-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  category text check (char_length(category) <= 60),
  brand text check (char_length(brand) <= 60),
  store text check (char_length(store) <= 120),
  purchase_date date not null,
  price_cents integer check (price_cents >= 0),
  currency char(3) not null default 'EUR',
  warranty_months smallint not null default 24 check (warranty_months between 0 and 240),
  warranty_until date generated always as ((purchase_date + make_interval(months => warranty_months))::date) stored,
  statutory_until date generated always as ((purchase_date + interval '2 years')::date) stored,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- lets child tables enforce "same owner" with a composite foreign key
  unique (id, user_id)
);
create index devices_user_warranty_idx on public.devices (user_id, warranty_until);

-- ---------------------------------------------------------------------------
-- documents (files live in the private "documents" bucket at {user_id}/{uuid}.{ext})
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  device_id uuid,
  kind public.document_kind not null,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf')),
  size_bytes integer check (size_bytes > 0 and size_bytes <= 15728640),
  created_at timestamptz not null default now(),
  check (storage_path like user_id::text || '/%'),
  foreign key (device_id, user_id) references public.devices (id, user_id) on delete cascade
);
create index documents_user_created_idx on public.documents (user_id, created_at desc);
create index documents_device_idx on public.documents (device_id) where device_id is not null;

-- ---------------------------------------------------------------------------
-- reminders (written only by the trigger below, consumed by the backend worker)
-- ---------------------------------------------------------------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_id uuid not null,
  kind public.reminder_kind not null,
  days_before smallint not null,
  due_date date not null,
  remind_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (device_id, kind, days_before),
  foreign key (device_id, user_id) references public.devices (id, user_id) on delete cascade
);
create index reminders_pending_idx on public.reminders (remind_at) where sent_at is null;
create index reminders_user_idx on public.reminders (user_id, remind_at);

-- ---------------------------------------------------------------------------
-- push tokens (Expo push tokens, one user may have several devices)
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  token text primary key check (char_length(token) <= 255),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

-- ---------------------------------------------------------------------------
-- triggers
-- ---------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger devices_set_updated_at before update on public.devices
  for each row execute function private.set_updated_at();
create trigger push_tokens_set_updated_at before update on public.push_tokens
  for each row execute function private.set_updated_at();

-- (Re)builds pending reminders 30 and 7 days before each deadline, at 09:00 Berlin time.
-- SECURITY DEFINER because users have no write access to reminders; lives in the
-- unexposed private schema and only acts on the row that fired the trigger.
create function private.schedule_device_reminders()
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
               ('statutory'::public.reminder_kind, new.statutory_until, true)) as d (kind, due, enabled)
  cross join (values (30), (7)) as o (days)
  where d.enabled and d.due - o.days >= current_date
  on conflict (device_id, kind, days_before) do update
    set due_date = excluded.due_date, remind_at = excluded.remind_at, sent_at = null;

  return null;
end;
$$;
revoke all on function private.schedule_device_reminders() from public, anon, authenticated;

create trigger devices_schedule_reminders_insert after insert on public.devices
  for each row execute function private.schedule_device_reminders();
create trigger devices_schedule_reminders_update after update on public.devices
  for each row
  when (old.purchase_date is distinct from new.purchase_date
        or old.warranty_months is distinct from new.warranty_months)
  execute function private.schedule_device_reminders();

-- Worker queue: atomically marks due reminders as sent and returns them.
-- SKIP LOCKED makes it safe to run on several backend instances at once.
create function public.claim_due_reminders(batch_size integer default 100)
returns table (
  id uuid, user_id uuid, device_id uuid, device_name text,
  kind public.reminder_kind, days_before smallint, due_date date
)
language sql
security invoker
set search_path = ''
as $$
  with due as (
    select r.id
    from public.reminders r
    where r.sent_at is null and r.remind_at <= now()
    order by r.remind_at
    limit batch_size
    for update skip locked
  )
  update public.reminders r
  set sent_at = now()
  from due, public.devices d
  where r.id = due.id and d.id = r.device_id
  returning r.id, r.user_id, r.device_id, d.name, r.kind, r.days_before, r.due_date;
$$;
revoke all on function public.claim_due_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer) to service_role;

-- ---------------------------------------------------------------------------
-- grants + RLS
-- ---------------------------------------------------------------------------
revoke all on public.devices, public.documents, public.reminders, public.push_tokens from anon;
grant select, insert, update, delete on public.devices, public.documents, public.push_tokens to authenticated;
grant select on public.reminders to authenticated;
grant all on public.devices, public.documents, public.reminders, public.push_tokens to service_role;

alter table public.devices enable row level security;
alter table public.documents enable row level security;
alter table public.reminders enable row level security;
alter table public.push_tokens enable row level security;

create policy "devices: owner select" on public.devices for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "devices: owner insert" on public.devices for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "devices: owner update" on public.devices for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "devices: owner delete" on public.devices for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "documents: owner select" on public.documents for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "documents: owner insert" on public.documents for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "documents: owner update" on public.documents for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "documents: owner delete" on public.documents for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "reminders: owner select" on public.reminders for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "push_tokens: owner select" on public.push_tokens for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "push_tokens: owner insert" on public.push_tokens for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "push_tokens: owner update" on public.push_tokens for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "push_tokens: owner delete" on public.push_tokens for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- storage: private bucket, each user only touches their own folder
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 15728640,
        array['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf']);

create policy "documents bucket: owner select" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents bucket: owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents bucket: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents bucket: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
