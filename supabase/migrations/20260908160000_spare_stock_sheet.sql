-- Spare-parts stock sheet fields used by AAML's Excel inventory format.

alter table public.products
  add column if not exists item_code text,
  add column if not exists condition text not null default 'NEW',
  add column if not exists rack_number text,
  add column if not exists remarks text,
  add column if not exists order_status text;

create unique index if not exists products_business_item_code_unique
  on public.products (business_id, item_code)
  where item_code is not null and btrim(item_code) <> '';
