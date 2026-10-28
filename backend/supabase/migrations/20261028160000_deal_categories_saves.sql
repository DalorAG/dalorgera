-- Aktionen for everything, not only Technik: a category per deal for the filter on the Übersicht,
-- supermarkets, Drogerie and Mode, and a Merkliste: users save deals they want to come back to.

alter table public.deals
  add column category text not null default 'technik'
    check (category in ('lebensmittel', 'drogerie', 'technik', 'haushalt', 'moebel', 'mode', 'heimwerken'));

update public.deals set category = case
  when image_url like '%/kitchen-mixer.jpg' or image_url like '%/delivery.jpg' then 'haushalt'
  when image_url like '%/hair-styler.jpg' then 'drogerie'
  when image_url similar to '%/(mattress|kitchen|sofa|furniture).jpg' then 'moebel'
  when image_url like '%/diy.jpg' then 'heimwerken'
  else 'technik'
end;

-- A neutral hair dryer instead of a styler set that looked like one particular brand.
update public.deals
  set image_url = replace(image_url, '/hair-styler.jpg', '/hair-dryer.jpg')
  where image_url like '%/hair-styler.jpg';

-- Checked on 28.10.2026. Flugblatt deals point at the always current weekly leaflet.
insert into public.deals (store, title, description, badge, url, image_url, accent, icon, category, valid_from, valid_until, sort)
select store, title, description, badge, url,
  'https://lunokowximvnzefgfnib.supabase.co/storage/v1/object/public/deal-images/' || image || '.jpg',
  accent, icon, category, null, valid_until::timestamptz, sort
from (values
  ('BILLA', 'Aktuelles Flugblatt', 'Wochenangebote für Lebensmittel, Getränke und Drogerie.', 'Wochenangebote',
    'https://www.billa.at/unsere-aktionen/flugblatt', 'groceries', '#E30613', 'cart-outline', 'lebensmittel', null, 1),
  ('SPAR', 'Aktionen & Flugblatt', 'Die Angebote der Woche bei SPAR, EUROSPAR und INTERSPAR.', 'Wochenangebote',
    'https://www.spar.at/angebote', 'supermarket', '#00843D', 'cart-outline', 'lebensmittel', null, 2),
  ('HOFER', 'Aktuelle Angebote', 'Lebensmittel, Haushalt und Aktionsware der Woche.', 'Wochenangebote',
    'https://www.hofer.at/de/angebote.html', 'groceries', '#00205B', 'cart-outline', 'lebensmittel', null, 3),
  ('Lidl', 'Lidl Plus: täglich neuer Gutschein', 'Jeden Tag ein neuer Coupon in der Lidl Plus App.', 'Täglich neu',
    'https://www.lidl.at', 'supermarket', '#0050AA', 'pricetag-outline', 'lebensmittel', '2026-11-01 00:00+01', 4),
  ('PENNY', 'Aktuelles Flugblatt', 'Die Angebote der Woche bei PENNY.', 'Wochenangebote',
    'https://www.penny.at/angebote', 'groceries', '#CD1719', 'cart-outline', 'lebensmittel', null, 5),
  ('BIPA', '5 € Rabatt für 250 Ös', 'Mit der jö App einlösen.', '−5 €',
    'https://www.bipa.at/cp/aktionen', 'drugstore', '#E6007E', 'sparkles-outline', 'drogerie', '2026-11-12 00:00+01', 6),
  ('dm', 'Aktuelle Aktionen', 'Pflege, Kosmetik, Baby und Haushalt im Angebot.', 'Aktionen',
    'https://www.dm.at', 'drugstore', '#002878', 'sparkles-outline', 'drogerie', null, 7),
  ('Zalando', 'Sale', 'Mode, Schuhe und Accessoires reduziert.', 'Sale',
    'https://www.zalando.at/sale/', 'fashion', '#FF6900', 'shirt-outline', 'mode', null, 8)
) as d (store, title, description, badge, url, image, accent, icon, category, valid_until, sort);

create index deals_category_idx on public.deals (category);

create table public.deal_saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  deal_id uuid not null references public.deals (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, deal_id)
);

create index deal_saves_deal_id_idx on public.deal_saves (deal_id);

grant select, insert, delete on public.deal_saves to authenticated;
grant all on public.deal_saves to service_role;
alter table public.deal_saves enable row level security;

create policy "deal_saves: owner select" on public.deal_saves for select to authenticated
  using (user_id = (select auth.uid()));
create policy "deal_saves: owner insert" on public.deal_saves for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "deal_saves: owner delete" on public.deal_saves for delete to authenticated
  using (user_id = (select auth.uid()));
