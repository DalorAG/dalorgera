-- Luxus-Versicherung: the same request flow as the Garantieverlängerung, for watches,
-- jewellery and bags. The team needs brand, serial number and the declared value,
-- since luxury items are often bought without a receipt or second hand.
alter table public.warranty_requests
  add column kind text not null default 'extension' check (kind in ('extension', 'luxury')),
  add column category text check (category in ('watch', 'jewelry', 'bag', 'other')),
  add column brand text check (char_length(brand) between 1 and 60),
  add column serial_number text check (char_length(serial_number) between 1 and 64),
  -- entered by the user, unlike price_cents which comes from the receipt
  add column value_cents integer check (value_cents >= 0),
  add constraint warranty_requests_luxury_category check (kind <> 'luxury' or category is not null);
