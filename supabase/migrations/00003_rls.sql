-- Row Level Security: every tenant can only see its own data.

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.warehouses enable row level security;
alter table public.products enable row level security;
alter table public.suppliers enable row level security;
alter table public.customers enable row level security;
alter table public.inventory enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_transfers enable row level security;
alter table public.stock_transfer_items enable row level security;
alter table public.inventory_counts enable row level security;
alter table public.inventory_count_items enable row level security;
alter table public.alerts enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;
alter table public.document_sequences enable row level security;

-- Profiles: users can read members of their business and their own row.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or (business_id is not null and public.is_business_member(business_id))
  );

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- Businesses
drop policy if exists "businesses_select" on public.businesses;
create policy "businesses_select" on public.businesses
  for select using (public.is_business_member(id) or owner_id = auth.uid());

drop policy if exists "businesses_insert" on public.businesses;
create policy "businesses_insert" on public.businesses
  for insert with check (owner_id = auth.uid());

drop policy if exists "businesses_update" on public.businesses;
create policy "businesses_update" on public.businesses
  for update using (public.is_business_member(id));

-- Generic tenant isolation helper policies
drop policy if exists "categories_all" on public.categories;
create policy "categories_all" on public.categories
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

drop policy if exists "warehouses_all" on public.warehouses;
create policy "warehouses_all" on public.warehouses
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

drop policy if exists "products_all" on public.products;
create policy "products_all" on public.products
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

drop policy if exists "suppliers_all" on public.suppliers;
create policy "suppliers_all" on public.suppliers
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

drop policy if exists "customers_all" on public.customers;
create policy "customers_all" on public.customers
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

drop policy if exists "inventory_all" on public.inventory;
create policy "inventory_all" on public.inventory
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

drop policy if exists "stock_transactions_select" on public.stock_transactions;
create policy "stock_transactions_select" on public.stock_transactions
  for select using (public.is_business_member(business_id));

drop policy if exists "stock_transactions_insert" on public.stock_transactions;
create policy "stock_transactions_insert" on public.stock_transactions
  for insert with check (public.is_business_member(business_id));

-- Purchases
drop policy if exists "purchases_all" on public.purchases;
create policy "purchases_all" on public.purchases
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

drop policy if exists "purchase_items_all" on public.purchase_items;
create policy "purchase_items_all" on public.purchase_items
  for all using (
    exists (
      select 1 from public.purchases p
      where p.id = purchase_id and public.is_business_member(p.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.purchases p
      where p.id = purchase_id and public.is_business_member(p.business_id)
    )
  );

drop policy if exists "sales_all" on public.sales;
create policy "sales_all" on public.sales
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

drop policy if exists "sale_items_all" on public.sale_items;
create policy "sale_items_all" on public.sale_items
  for all using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id and public.is_business_member(s.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.sales s
      where s.id = sale_id and public.is_business_member(s.business_id)
    )
  );

drop policy if exists "transfers_all" on public.stock_transfers;
create policy "transfers_all" on public.stock_transfers
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

drop policy if exists "transfer_items_all" on public.stock_transfer_items;
create policy "transfer_items_all" on public.stock_transfer_items
  for all using (
    exists (
      select 1 from public.stock_transfers t
      where t.id = transfer_id and public.is_business_member(t.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.stock_transfers t
      where t.id = transfer_id and public.is_business_member(t.business_id)
    )
  );

drop policy if exists "counts_all" on public.inventory_counts;
create policy "counts_all" on public.inventory_counts
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

drop policy if exists "count_items_all" on public.inventory_count_items;
create policy "count_items_all" on public.inventory_count_items
  for all using (
    exists (
      select 1 from public.inventory_counts c
      where c.id = inventory_count_id and public.is_business_member(c.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.inventory_counts c
      where c.id = inventory_count_id and public.is_business_member(c.business_id)
    )
  );

drop policy if exists "alerts_all" on public.alerts;
create policy "alerts_all" on public.alerts
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

drop policy if exists "audit_logs_select" on public.audit_logs;
create policy "audit_logs_select" on public.audit_logs
  for select using (public.is_business_member(business_id));

drop policy if exists "audit_logs_insert" on public.audit_logs;
create policy "audit_logs_insert" on public.audit_logs
  for insert with check (public.is_business_member(business_id));

drop policy if exists "settings_all" on public.settings;
create policy "settings_all" on public.settings
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

drop policy if exists "document_sequences_all" on public.document_sequences;
create policy "document_sequences_all" on public.document_sequences
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.apply_stock_transaction to authenticated;
grant execute on function public.next_document_number to authenticated;
grant execute on function public.current_business_id to authenticated;
grant execute on function public.current_user_role to authenticated;
grant execute on function public.seed_default_settings to authenticated;
