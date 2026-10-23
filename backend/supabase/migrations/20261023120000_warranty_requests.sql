-- Garantieverlängerung-Anfragen: a user asks us for an extended warranty or insurance
-- for a purchase without (enough) manufacturer warranty, e.g. a dress or an old device.
-- Our team is notified by email and follows up; users can only create and read their own.
alter table public.documents add constraint documents_id_user_id_key unique (id, user_id);

create table public.warranty_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  document_id uuid,
  product_name text not null check (char_length(product_name) between 1 and 120),
  store text check (char_length(store) <= 120),
  purchase_date date,
  price_cents integer check (price_cents >= 0),
  currency char(3),
  message text check (char_length(message) <= 1000),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now(),
  -- the request outlives a deleted receipt; set null keeps user_id
  foreign key (document_id, user_id) references public.documents (id, user_id) on delete set null (document_id)
);
create index warranty_requests_user_created_idx on public.warranty_requests (user_id, created_at desc);
create index warranty_requests_document_idx on public.warranty_requests (document_id) where document_id is not null;
create index warranty_requests_open_idx on public.warranty_requests (created_at) where status = 'new';

revoke all on public.warranty_requests from anon;
grant select, insert on public.warranty_requests to authenticated;
grant all on public.warranty_requests to service_role;

alter table public.warranty_requests enable row level security;

-- Status is changed by our team (service role) only: no update or delete policies for users.
create policy "warranty_requests: owner select" on public.warranty_requests for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "warranty_requests: owner insert" on public.warranty_requests for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'new');
