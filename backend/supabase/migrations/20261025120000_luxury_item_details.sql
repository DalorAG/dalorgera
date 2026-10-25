-- Kaufdetails of a Wertsache in the Tresor. value_cents stays the current value
-- (Aktueller Wert, also what gets insured); the purchase price is kept separately
-- so the Tresor can show what was spent next to what it is worth today.
alter table public.luxury_items
  add column purchase_price_cents integer check (purchase_price_cents >= 0),
  add column purchase_date date,
  add column store text check (char_length(store) between 1 and 120),
  add column reference_number text check (char_length(reference_number) between 1 and 64),
  add column has_box_papers boolean not null default false;
