-- Aktionen österreichischer Händler on the Übersicht.
-- Maintained by the team (dashboard / service role); every signed-in user reads the running ones.
-- Texts are German, as the shops publish them; a deal disappears by itself after valid_until.
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  store text not null,
  title text not null,
  description text,
  -- short label on the card, e.g. "−30 €" or "bis −60 %"
  badge text,
  url text not null check (url like 'https://%'),
  -- picture on top of the card; without one the card shows the icon on the accent colour
  image_url text check (image_url like 'https://%'),
  -- the shop's colour, #RRGGBB
  accent text not null default '#1F6F5C' check (accent ~ '^#[0-9A-Fa-f]{6}$'),
  -- Ionicons name, e.g. 'tv-outline'
  icon text not null default 'pricetag-outline',
  -- null: already running / no end date (bis auf Widerruf)
  valid_from timestamptz,
  valid_until timestamptz,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index deals_valid_until_idx on public.deals (valid_until);

grant select on public.deals to authenticated;
grant all on public.deals to service_role;
alter table public.deals enable row level security;

create policy "deals: running select" on public.deals for select to authenticated
  using ((valid_from is null or valid_from <= now()) and (valid_until is null or valid_until > now()));

-- Checked on 28.10.2026 on the shops' pages and rewardo.at.
insert into public.deals (store, title, description, badge, url, accent, icon, valid_from, valid_until, sort) values
  ('MediaMarkt', 'Black Friday', 'Rabatte auf Haushaltsgeräte, Smartphones, Laptops, TV und mehr.', 'Black Friday',
    'https://www.mediamarkt.at/de/campaign/black-friday-haushalt', '#DF0000', 'pricetags-outline', '2026-11-20 00:00+01', '2026-12-01 00:00+01', 10),
  ('Grover', '30 € Rabatt für Neukunden', 'Technik mieten statt kaufen, z. B. Smartphones, Laptops und Konsolen.', '−30 €',
    'https://www.grover.com/at-de', '#F43F5E', 'phone-portrait-outline', null, '2027-01-01 00:00+01', 20),
  ('OTTO', 'Technik-Deals', 'Ausgewählte Elektronik und Haushaltsgeräte reduziert.', 'bis −60 %',
    'https://www.otto.at', '#C8102E', 'tv-outline', null, null, 30),
  ('cyberport', 'Outlet', 'Einzelstücke und Restposten: PCs, Smartphones, Tablets und Zubehör.', 'bis −70 %',
    'https://www.cyberport.at', '#0B4EA2', 'laptop-outline', null, null, 40),
  ('Dyson', 'Airwrap Geschenk-Edition', 'Mit gratis Zubehör.', 'Gratis Zubehör',
    'https://www.dyson.at', '#5B3A8C', 'sparkles-outline', null, '2026-11-09 00:00+01', 50),
  ('Kenwood', 'Cooking Chef: Geschenke bis 357 €', 'Zur Cooking Chef Sallys Edition.', 'bis 357 €',
    'https://www.kenwoodworld.com/de-at', '#2B2B2B', 'restaurant-outline', null, '2027-01-01 00:00+01', 60);
