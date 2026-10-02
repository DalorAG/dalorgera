-- Result of AI recognition (OpenAI) for a receipt / warranty card photo.
-- Cached so the same photo is never sent twice.
alter table public.documents
  add column extracted jsonb,
  add column extracted_at timestamptz;
