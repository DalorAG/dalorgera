-- Luxusartikel: watches, jewellery and bags the user keeps in the app. Insurance is
-- requested per item from its detail screen; the request (warranty_requests, kind
-- 'luxury') points back at the item. Photos are documents attached to the item.
create table public.luxury_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (category in ('watch', 'jewelry', 'bag', 'other')),
  brand text not null check (char_length(brand) between 1 and 60),
  model text not null check (char_length(model) between 1 and 120),
  value_cents integer check (value_cents >= 0),
  currency char(3) not null default 'EUR',
  serial_number text check (char_length(serial_number) between 1 and 64),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index luxury_items_user_created_idx on public.luxury_items (user_id, created_at desc);

create trigger luxury_items_set_updated_at before update on public.luxury_items
  for each row execute function private.set_updated_at();

-- A photo belongs to a device or to a luxury item, never both.
alter table public.documents
  add column luxury_item_id uuid,
  add constraint documents_luxury_item_fkey foreign key (luxury_item_id, user_id)
    references public.luxury_items (id, user_id) on delete cascade,
  add constraint documents_single_owner check (device_id is null or luxury_item_id is null);
create index documents_luxury_item_user_idx on public.documents (luxury_item_id, user_id) where luxury_item_id is not null;

-- The request outlives a deleted item; set null keeps user_id.
alter table public.warranty_requests
  add column luxury_item_id uuid,
  add constraint warranty_requests_luxury_item_fkey foreign key (luxury_item_id, user_id)
    references public.luxury_items (id, user_id) on delete set null (luxury_item_id);
create index warranty_requests_luxury_item_idx on public.warranty_requests (luxury_item_id) where luxury_item_id is not null;

revoke all on public.luxury_items from anon;
grant select, insert, update, delete on public.luxury_items to authenticated;
grant all on public.luxury_items to service_role;

alter table public.luxury_items enable row level security;

create policy "luxury_items: owner select" on public.luxury_items for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "luxury_items: owner insert" on public.luxury_items for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "luxury_items: owner update" on public.luxury_items for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "luxury_items: owner delete" on public.luxury_items for delete to authenticated
  using ((select auth.uid()) = user_id);
