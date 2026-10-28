-- Pictures for the Aktionen and more shops, so every area is covered:
-- Technik, TV, Haushalt, Küche, Beauty, Möbel, Schlafen, Heimwerken.
-- Pictures are generated Symbolbilder (no brands) in the public deal-images bucket.
-- Safe to run again: the bucket is kept, the deals are replaced.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('deal-images', 'deal-images', true, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

delete from public.deals;

-- Checked on 28.10.2026 on the shops' pages and rewardo.at.
insert into public.deals (store, title, description, badge, url, image_url, accent, icon, valid_from, valid_until, sort)
select store, title, description, badge, url,
  'https://lunokowximvnzefgfnib.supabase.co/storage/v1/object/public/deal-images/' || image || '.jpg',
  accent, icon, valid_from::timestamptz, valid_until::timestamptz, sort
from (values
  ('MediaMarkt', 'Black Friday', 'Rabatte auf Haushaltsgeräte, Smartphones, Laptops, TV und mehr.', 'Black Friday',
    'https://www.mediamarkt.at/de/campaign/black-friday', 'black-friday', '#DF0000', 'pricetags-outline',
    '2026-11-20 00:00+01', '2026-12-01 00:00+01', 10),
  ('MediaMarkt', 'Gratis Lieferung für Großgeräte & TV', 'Gratis Paketversand online und Basic-Lieferung für Großgeräte und TVs ab 43 Zoll.', 'Gratis',
    'https://www.mediamarkt.at/de/campaign/black-friday', 'delivery', '#DF0000', 'cube-outline',
    null, '2026-12-01 00:00+01', 20),
  ('MediaMarkt', 'Bis 250 € Coupon geschenkt', 'Ab 250 € Einkauf: Coupon für den nächsten Einkauf, einlösbar 10.11.–31.12.', 'bis 250 €',
    'https://www.mediamarkt.at/de/campaign/deal-maxxing-coupons', 'coupon', '#DF0000', 'gift-outline',
    null, '2026-11-10 00:00+01', 30),
  ('Samsung', 'Bis 1.000 € Sofortrabatt auf TVs', 'Beim Kauf eines neuen Samsung-TV gegen Eintausch des alten.', 'bis −1.000 €',
    'https://www.samsung.com/at/offer/', 'tv', '#1428A0', 'tv-outline',
    null, null, 40),
  ('Grover', '30 € Rabatt für Neukunden', 'Technik mieten statt kaufen: Smartphones, Laptops und Konsolen.', '−30 €',
    'https://www.grover.com/at-de', 'tech-rental', '#F43F5E', 'phone-portrait-outline',
    null, '2027-01-01 00:00+01', 50),
  ('OTTO', 'Technik-Deals', 'Kopfhörer, Smartwatches, Lautsprecher und mehr reduziert.', 'bis −60 %',
    'https://www.otto.at', 'tech-deals', '#C8102E', 'headset-outline',
    null, null, 60),
  ('cyberport', 'Outlet', 'Einzelstücke und Restposten: PCs, Smartphones, Tablets und Zubehör.', 'bis −70 %',
    'https://www.cyberport.at', 'outlet', '#0B4EA2', 'laptop-outline',
    null, null, 70),
  ('Dyson', 'Airwrap Geschenk-Edition', 'Mit gratis Zubehör.', 'Gratis Zubehör',
    'https://www.dyson.at', 'hair-styler', '#5B3A8C', 'sparkles-outline',
    null, '2026-11-09 00:00+01', 80),
  ('Kenwood', 'Cooking Chef: Geschenke bis 357 €', 'Zur Cooking Chef Sallys Edition.', 'bis 357 €',
    'https://www.kenwoodworld.com/de-at', 'kitchen-mixer', '#2B2B2B', 'restaurant-outline',
    null, '2027-01-01 00:00+01', 90),
  ('IKEA', 'VALEVÅG Matratzen', 'Ausgewählte Matratzen günstiger.', 'bis −25 %',
    'https://www.ikea.com/at/de/offers/', 'mattress', '#0058A3', 'bed-outline',
    null, null, 100),
  ('IKEA', '100 € Gutschein je 1.000 € Küche', 'Beim Kauf einer Küche ab 3.000 €.', '100 € je 1.000 €',
    'https://www.ikea.com/at/de/offers/', 'kitchen', '#0058A3', 'restaurant-outline',
    null, null, 110),
  ('IKEA', '25 € Gutschein je 200 € Sofa', 'Für IKEA Family Mitglieder, Gutschein einlösbar bis 17.12.', '25 € je 200 €',
    'https://www.ikea.com/at/de/offers/', 'sofa', '#0058A3', 'home-outline',
    null, '2026-11-03 00:00+01', 120),
  ('mömax', 'Early Black Friday: 1+1', '50 % Rabatt auf den zweiten Artikel.', '−50 %',
    'https://www.moemax.at', 'furniture', '#D6006D', 'home-outline',
    null, '2026-11-17 00:00+01', 130),
  ('OBI', 'Oktober-Angebote', 'Werkzeug, Garten und Wohnen reduziert.', 'bis −40 %',
    'https://www.obi.at', 'diy', '#FF7E21', 'hammer-outline',
    null, '2026-11-01 00:00+01', 140)
) as d (store, title, description, badge, url, image, accent, icon, valid_from, valid_until, sort);
