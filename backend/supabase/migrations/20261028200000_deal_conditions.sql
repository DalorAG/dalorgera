-- Deal detail screen: the conditions in the shop's words, and two more Technik deals.
alter table public.deals add column conditions text;

update public.deals set conditions = c.conditions
from (values
  ('MediaMarkt', 'Gratis Lieferung%', 'Gratis Paketversand im Onlineshop für paketfähige Produkte bis 31,5 kg. Gratis Basic-Lieferung für Großgeräte und TVs ab 43 Zoll, im Markt und online. Nur für sofort verfügbare Produkte, die MediaMarkt selbst verkauft.'),
  ('MediaMarkt', 'Bis 250 €%', 'Ab 250 € Einkaufswert gibt es einen Coupon für den nächsten Einkauf. Einlösbar von 10.11. bis 31.12.2026.'),
  ('Samsung', 'Bis 1.000 €%', 'Beim Kauf eines neuen Samsung-TV und Eintausch des alten Geräts. Höhe des Sofortrabatts je nach Modell.'),
  ('Grover', '30 €%', 'Nur für Neukunden, gültig bis 31.12.2026.'),
  ('IKEA', '25 €%', 'Für IKEA Family und IKEA Business Network Mitglieder. Gilt für Sofas, Bettsofas und passende Hocker, nicht für Sessel. Gutschein einlösbar von 03.11. bis 17.12.2026.'),
  ('IKEA', '100 €%', 'Je 1.000 € Küchenkauf ein 100 € Gutschein, ab einem Einkauf von 3.000 €.'),
  ('mömax', 'Early Black Friday%', 'Beim Kauf von zwei Artikeln gibt es 50 % auf den günstigeren.'),
  ('BIPA', '5 €%', 'Für 250 Ös in der jö App einlösbar.')
) as c (store, title, conditions)
where public.deals.store = c.store and public.deals.title like c.title and public.deals.conditions is null;

insert into public.deals (store, title, description, conditions, badge, url, image_url, accent, icon, category, valid_until, sort)
values
  ('e-tec', '5 € für Neukunden', 'Bei Anmeldung zum WhatsApp-Newsletter.', 'Nur für die erste Bestellung.', '−5 €',
    'https://www.e-tec.at', 'https://lunokowximvnzefgfnib.supabase.co/storage/v1/object/public/deal-images/outlet.jpg',
    '#E2001A', 'laptop-outline', 'technik', null, 75),
  ('Samsung', 'Samsung Week: dreifache Rewards', 'Dreifache Samsung Rewards Punkte auf Einkäufe im Samsung Shop.', null, '3× Punkte',
    'https://www.samsung.com/at/offer/', 'https://lunokowximvnzefgfnib.supabase.co/storage/v1/object/public/deal-images/tech-deals.jpg',
    '#1428A0', 'star-outline', 'technik', '2026-11-03 00:00+01', 45);
