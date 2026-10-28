-- When our team confirmed a request: set when the status becomes 'closed', so the app can show
-- "Bestätigt am". Reopening clears it. Rows closed before this migration keep null (date unknown).
alter table public.warranty_requests add column closed_at timestamptz;

create function private.set_request_closed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.closed_at := case when new.status = 'closed' then now() else null end;
  return new;
end;
$$;

revoke all on function private.set_request_closed_at() from public, anon, authenticated;

create trigger warranty_requests_set_closed_at before update on public.warranty_requests
  for each row
  when (old.status is distinct from new.status)
  execute function private.set_request_closed_at();
