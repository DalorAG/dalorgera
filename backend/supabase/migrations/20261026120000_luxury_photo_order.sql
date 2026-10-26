-- Order of a Wertsache's photos as the owner arranged them; the first one is the cover in the Tresor.
-- Photos missing from the list (new uploads) follow in upload order.
alter table public.luxury_items add column photo_order uuid[] not null default '{}';
