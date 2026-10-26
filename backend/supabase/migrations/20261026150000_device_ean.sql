-- EAN/GTIN from the product barcode on the box: lets the user find a device by scanning it again.
alter table public.devices
  add column ean text check (ean ~ '^[0-9]{8,14}$');
create index devices_user_ean_idx on public.devices (user_id, ean) where ean is not null;
