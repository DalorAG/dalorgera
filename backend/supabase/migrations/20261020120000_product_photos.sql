-- Produktfoto: a picture of the device itself, shown as its thumbnail.
-- Stored like a receipt photo but never listed under "Belege" and never recognized.
alter type public.document_kind add value if not exists 'product_photo';
