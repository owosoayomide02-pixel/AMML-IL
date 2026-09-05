-- Price history for fluctuation insights and anomaly detection.

create table if not exists public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  cost_price numeric(14, 2) not null,
  selling_price numeric(14, 2) not null,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists product_price_history_product_idx
  on public.product_price_history (business_id, product_id, created_at desc);

alter table public.product_price_history enable row level security;

drop policy if exists "price_history_all" on public.product_price_history;
create policy "price_history_all" on public.product_price_history
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
