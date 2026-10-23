-- Seriennummer and IMEI: needed for warranty claims, insurance and theft reports.
-- Scanned from the barcode on the box or typed in; the app checks the IMEI checksum as well.
alter table public.devices
  add column serial_number text check (char_length(serial_number) between 1 and 64),
  add column imei text check (imei ~ '^[0-9]{15}$');
