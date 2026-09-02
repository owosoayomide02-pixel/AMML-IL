-- Inventory Pro initial schema
-- Multi-tenant inventory management with UUID primary keys

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('owner', 'admin', 'manager', 'storekeeper', 'sales_staff', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_status as enum ('active', 'invited', 'disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_status as enum ('active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.warehouse_status as enum ('active', 'disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('unpaid', 'partial', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.purchase_status as enum ('draft', 'ordered', 'partially_received', 'received', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sale_status as enum ('draft', 'confirmed', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transfer_status as enum ('draft', 'pending', 'in_transit', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.count_status as enum ('draft', 'in_progress', 'pending_approval', 'approved', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.alert_severity as enum ('info', 'warning', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'card', 'bank_transfer', 'mobile_money', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stock_transaction_type as enum (
    'opening_stock',
    'stock_in',
    'stock_out',
    'sale',
    'purchase',
    'adjustment_in',
    'adjustment_out',
    'transfer_in',
    'transfer_out',
    'return_in',
    'return_out',
    'damaged',
    'expired'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Core tenant tables
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  business_email text,
  phone text,
  address text,
  city text,
  state text,
  country text,
  currency text not null default 'USD',
  logo_url text,
  tax_number text,
  owner_id uuid not null references auth.users (id) on delete restrict,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  full_name text not null default '',
  email text not null,
  phone text,
  avatar_url text,
  role public.user_role not null default 'viewer',
  status public.user_status not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  code text not null,
  address text,
  description text,
  status public.warehouse_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, code)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  sku text not null,
  barcode text,
  name text not null,
  description text,
  brand text,
  manufacturer text,
  unit text not null default 'pcs',
  cost_price numeric(14, 2) not null default 0 check (cost_price >= 0),
  selling_price numeric(14, 2) not null default 0 check (selling_price >= 0),
  minimum_stock_level numeric(14, 4) not null default 0 check (minimum_stock_level >= 0),
  reorder_quantity numeric(14, 4) not null default 0 check (reorder_quantity >= 0),
  image_url text,
  status public.product_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, sku)
);

create unique index if not exists products_business_barcode_unique
  on public.products (business_id, barcode)
  where barcode is not null and barcode <> '';

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  supplier_name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  country text,
  tax_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_name text not null,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  warehouse_id uuid not null references public.warehouses (id) on delete cascade,
  quantity_on_hand numeric(14, 4) not null default 0,
  quantity_reserved numeric(14, 4) not null default 0 check (quantity_reserved >= 0),
  quantity_available numeric(14, 4) generated always as (quantity_on_hand - quantity_reserved) stored,
  updated_at timestamptz not null default now(),
  unique (business_id, product_id, warehouse_id)
);

create table if not exists public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  warehouse_id uuid not null references public.warehouses (id) on delete restrict,
  transaction_type public.stock_transaction_type not null,
  quantity numeric(14, 4) not null check (quantity > 0),
  unit_cost numeric(14, 4),
  reference_type text,
  reference_id uuid,
  reason text,
  notes text,
  performed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  purchase_number text not null,
  purchase_date date not null default current_date,
  expected_delivery_date date,
  status public.purchase_status not null default 'draft',
  subtotal numeric(14, 2) not null default 0,
  tax numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  amount_paid numeric(14, 2) not null default 0,
  balance numeric(14, 2) not null default 0,
  payment_status public.payment_status not null default 'unpaid',
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, purchase_number)
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  warehouse_id uuid not null references public.warehouses (id) on delete restrict,
  quantity numeric(14, 4) not null check (quantity > 0),
  received_quantity numeric(14, 4) not null default 0 check (received_quantity >= 0),
  cost_price numeric(14, 4) not null default 0 check (cost_price >= 0),
  tax numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  invoice_number text not null,
  sale_date date not null default current_date,
  status public.sale_status not null default 'draft',
  subtotal numeric(14, 2) not null default 0,
  tax numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  amount_paid numeric(14, 2) not null default 0,
  balance numeric(14, 2) not null default 0,
  payment_status public.payment_status not null default 'unpaid',
  payment_method public.payment_method,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, invoice_number)
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  warehouse_id uuid not null references public.warehouses (id) on delete restrict,
  quantity numeric(14, 4) not null check (quantity > 0),
  selling_price numeric(14, 4) not null default 0 check (selling_price >= 0),
  cost_price numeric(14, 4) not null default 0 check (cost_price >= 0),
  tax numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  transfer_number text not null,
  from_warehouse_id uuid not null references public.warehouses (id) on delete restrict,
  to_warehouse_id uuid not null references public.warehouses (id) on delete restrict,
  status public.transfer_status not null default 'draft',
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (business_id, transfer_number),
  check (from_warehouse_id <> to_warehouse_id)
);

create table if not exists public.stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.stock_transfers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity numeric(14, 4) not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  warehouse_id uuid not null references public.warehouses (id) on delete restrict,
  count_number text not null,
  count_date date not null default current_date,
  status public.count_status not null default 'draft',
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (business_id, count_number)
);

create table if not exists public.inventory_count_items (
  id uuid primary key default gen_random_uuid(),
  inventory_count_id uuid not null references public.inventory_counts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  system_quantity numeric(14, 4) not null default 0,
  counted_quantity numeric(14, 4),
  variance numeric(14, 4),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  severity public.alert_severity not null default 'info',
  related_product_id uuid references public.products (id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  setting_key text not null,
  setting_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, setting_key)
);

create table if not exists public.document_sequences (
  business_id uuid not null references public.businesses (id) on delete cascade,
  document_type text not null,
  year integer not null,
  last_value integer not null default 0,
  primary key (business_id, document_type, year)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_profiles_business on public.profiles (business_id);
create index if not exists idx_profiles_email on public.profiles (email);
create index if not exists idx_products_business_name on public.products (business_id, name);
create index if not exists idx_products_sku on public.products (business_id, sku);
create index if not exists idx_products_barcode on public.products (business_id, barcode);
create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_inventory_product on public.inventory (product_id);
create index if not exists idx_inventory_warehouse on public.inventory (warehouse_id);
create index if not exists idx_stock_tx_business_created on public.stock_transactions (business_id, created_at desc);
create index if not exists idx_stock_tx_product on public.stock_transactions (product_id, created_at desc);
create index if not exists idx_purchases_business_date on public.purchases (business_id, purchase_date desc);
create index if not exists idx_sales_business_date on public.sales (business_id, sale_date desc);
create index if not exists idx_sales_customer on public.sales (customer_id);
create index if not exists idx_purchases_supplier on public.purchases (supplier_id);
create index if not exists idx_alerts_unread on public.alerts (business_id, is_read, created_at desc);
create index if not exists idx_audit_logs_business on public.audit_logs (business_id, created_at desc);
create index if not exists idx_sale_items_product on public.sale_items (product_id);
create index if not exists idx_purchase_items_product on public.purchase_items (product_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists trg_businesses_updated on public.businesses;
create trigger trg_businesses_updated before update on public.businesses
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated on public.categories;
create trigger trg_categories_updated before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_warehouses_updated on public.warehouses;
create trigger trg_warehouses_updated before update on public.warehouses
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_suppliers_updated on public.suppliers;
create trigger trg_suppliers_updated before update on public.suppliers
for each row execute function public.set_updated_at();

drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists trg_purchases_updated on public.purchases;
create trigger trg_purchases_updated before update on public.purchases
for each row execute function public.set_updated_at();

drop trigger if exists trg_sales_updated on public.sales;
create trigger trg_sales_updated before update on public.sales
for each row execute function public.set_updated_at();

drop trigger if exists trg_settings_updated on public.settings;
create trigger trg_settings_updated before update on public.settings
for each row execute function public.set_updated_at();
