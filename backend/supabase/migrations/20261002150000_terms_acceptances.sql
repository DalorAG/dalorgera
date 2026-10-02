-- Record of each user's consent to the terms of use (Nutzungsbedingungen).
-- One row per accepted version; a new terms version requires a new acceptance.
create table public.terms_acceptances (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  version text not null check (char_length(version) between 1 and 32),
  accepted_at timestamptz not null default now(),
  primary key (user_id, version)
);

revoke all on public.terms_acceptances from anon;
grant select, insert on public.terms_acceptances to authenticated;
grant all on public.terms_acceptances to service_role;

alter table public.terms_acceptances enable row level security;

-- Consent is append-only for users: no update or delete policies.
create policy "terms_acceptances: owner select" on public.terms_acceptances for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "terms_acceptances: owner insert" on public.terms_acceptances for insert to authenticated
  with check ((select auth.uid()) = user_id);
