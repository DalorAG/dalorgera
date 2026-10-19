-- Full text of a recognized receipt / warranty card, line by line, plus a
-- German full-text index so documents can be searched (store, product, ...).
alter table public.documents
  add column raw_text text check (char_length(raw_text) <= 20000),
  add column search tsvector generated always as (
    to_tsvector('german', coalesce(raw_text, '') || ' ' || coalesce(extracted ->> 'merchant', ''))
  ) stored;

create index documents_search_idx on public.documents using gin (search);
