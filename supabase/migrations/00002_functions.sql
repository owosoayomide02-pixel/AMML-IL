-- Atomic inventory operations, document numbers, alerts, and profile bootstrap

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and business_id = p_business_id
      and status = 'active'
  )
$$;

create or replace function public.allow_negative_inventory(p_business_id uuid)
returns boolean
language sql
stable
as $$
  select coalesce(
    (
      select (setting_value->>'enabled')::boolean
      from public.settings
      where business_id = p_business_id
        and setting_key = 'allow_negative_inventory'
    ),
    false
  )
$$;

create or replace function public.next_document_number(
  p_business_id uuid,
  p_document_type text,
  p_prefix text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from now())::integer;
  v_next integer;
begin
  insert into public.document_sequences (business_id, document_type, year, last_value)
  values (p_business_id, p_document_type, v_year, 1)
  on conflict (business_id, document_type, year)
  do update set last_value = public.document_sequences.last_value + 1
  returning last_value into v_next;

  return p_prefix || '-' || v_year::text || '-' || lpad(v_next::text, 6, '0');
end;
$$;

create or replace function public.ensure_inventory_row(
  p_business_id uuid,
  p_product_id uuid,
  p_warehouse_id uuid
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into public.inventory (business_id, product_id, warehouse_id)
  values (p_business_id, p_product_id, p_warehouse_id)
  on conflict (business_id, product_id, warehouse_id) do nothing;

  select id into v_id
  from public.inventory
  where business_id = p_business_id
    and product_id = p_product_id
    and warehouse_id = p_warehouse_id;

  return v_id;
end;
$$;

create or replace function public.apply_stock_transaction(
  p_business_id uuid,
  p_product_id uuid,
  p_warehouse_id uuid,
  p_transaction_type public.stock_transaction_type,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_reason text default null,
  p_notes text default null,
  p_performed_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta numeric;
  v_on_hand numeric;
  v_tx_id uuid;
  v_allow_negative boolean;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  if auth.uid() is not null and not public.is_business_member(p_business_id) then
    raise exception 'Not authorized';
  end if;

  v_delta := case
    when p_transaction_type in (
      'opening_stock', 'stock_in', 'purchase', 'adjustment_in',
      'transfer_in', 'return_in'
    ) then p_quantity
    else -p_quantity
  end;

  perform public.ensure_inventory_row(p_business_id, p_product_id, p_warehouse_id);

  select quantity_on_hand
    into v_on_hand
  from public.inventory
  where business_id = p_business_id
    and product_id = p_product_id
    and warehouse_id = p_warehouse_id
  for update;

  v_allow_negative := public.allow_negative_inventory(p_business_id);

  if v_delta < 0 and not v_allow_negative and (v_on_hand + v_delta) < 0 then
    raise exception 'Insufficient stock. This movement would reduce quantity below zero.';
  end if;

  update public.inventory
  set
    quantity_on_hand = quantity_on_hand + v_delta,
    updated_at = now()
  where business_id = p_business_id
    and product_id = p_product_id
    and warehouse_id = p_warehouse_id;

  insert into public.stock_transactions (
    business_id, product_id, warehouse_id, transaction_type, quantity,
    unit_cost, reference_type, reference_id, reason, notes, performed_by
  )
  values (
    p_business_id, p_product_id, p_warehouse_id, p_transaction_type, p_quantity,
    p_unit_cost, p_reference_type, p_reference_id, p_reason, p_notes, p_performed_by
  )
  returning id into v_tx_id;

  perform public.refresh_stock_alerts(p_business_id, p_product_id);

  return v_tx_id;
end;
$$;

create or replace function public.refresh_stock_alerts(
  p_business_id uuid,
  p_product_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product record;
  v_available numeric;
  v_title text;
  v_message text;
  v_severity public.alert_severity;
  v_type text;
begin
  select p.name, p.sku, p.minimum_stock_level
    into v_product
  from public.products p
  where p.id = p_product_id and p.business_id = p_business_id;

  if not found then
    return;
  end if;

  select coalesce(sum(quantity_available), 0)
    into v_available
  from public.inventory
  where business_id = p_business_id and product_id = p_product_id;

  if v_available > v_product.minimum_stock_level then
    update public.alerts
    set is_read = true
    where business_id = p_business_id
      and related_product_id = p_product_id
      and type in ('low_stock', 'critical_stock', 'out_of_stock')
      and is_read = false;
    return;
  end if;

  if v_available <= 0 then
    v_type := 'out_of_stock';
    v_severity := 'critical';
    v_title := 'Out of Stock';
    v_message := v_product.name || ' (' || v_product.sku || ') is out of stock.';
  elsif v_available <= (v_product.minimum_stock_level * 0.5) then
    v_type := 'critical_stock';
    v_severity := 'critical';
    v_title := 'Critical Stock';
    v_message := v_product.name || ' (' || v_product.sku || ') is critically low at ' || v_available::text || '.';
  else
    v_type := 'low_stock';
    v_severity := 'warning';
    v_title := 'Low Stock';
    v_message := v_product.name || ' (' || v_product.sku || ') is at or below the minimum level.';
  end if;

  if not exists (
    select 1 from public.alerts
    where business_id = p_business_id
      and related_product_id = p_product_id
      and type = v_type
      and is_read = false
  ) then
    insert into public.alerts (
      business_id, type, title, message, severity, related_product_id
    ) values (
      p_business_id, v_type, v_title, v_message, v_severity, p_product_id
    );
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, business_id, full_name, email, role, status)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'business_id', '')::uuid,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'owner'),
    case when new.raw_user_meta_data->>'business_id' is not null then 'invited' else 'active' end
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.seed_default_settings(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.settings (business_id, setting_key, setting_value)
  values
    (p_business_id, 'allow_negative_inventory', '{"enabled": false}'::jsonb),
    (p_business_id, 'default_unit', '{"value": "pcs"}'::jsonb),
    (p_business_id, 'sku_format', '{"prefix": "SKU"}'::jsonb),
    (p_business_id, 'invoice_prefix', '{"value": "INV"}'::jsonb),
    (p_business_id, 'purchase_prefix', '{"value": "PO"}'::jsonb),
    (p_business_id, 'default_tax', '{"rate": 0}'::jsonb),
    (p_business_id, 'low_stock_alerts', '{"enabled": true}'::jsonb)
  on conflict (business_id, setting_key) do nothing;
end;
$$;
