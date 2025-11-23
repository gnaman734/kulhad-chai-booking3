-- Inventory schema for real-time stock tracking
-- Requires pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- Table: inventory_items
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  category text,
  unit text default 'pcs',
  reorder_threshold integer default 0,
  reorder_quantity integer default 0,
  quantity_on_hand integer not null default 0,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_inventory_items_updated_at on public.inventory_items;
create trigger trg_inventory_items_updated_at
before update on public.inventory_items
for each row execute function public.touch_updated_at();

-- Table: stock_movements
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  type text not null check (type in ('purchase','sale','adjustment','return')),
  quantity_change integer not null,
  before_qty integer not null,
  after_qty integer not null,
  source_type text,
  source_id text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_item_created
  on public.stock_movements (item_id, created_at desc);

-- Table: inventory_alerts
create table if not exists public.inventory_alerts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  alert_type text not null check (alert_type = 'low_stock'),
  current_qty integer not null,
  threshold integer not null,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_alerts_item_ack
  on public.inventory_alerts (item_id, acknowledged);

-- Mapping: menu items to inventory items (BOM-style)
create table if not exists public.menu_inventory_map (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  units_per_item integer not null default 1,
  created_at timestamptz not null default now(),
  unique (menu_item_id, inventory_item_id)
);

-- RPC: apply_stock_adjustment(item_id, delta, type, source_type, source_id, notes, created_by)
create or replace function public.apply_stock_adjustment(
  p_item_id uuid,
  p_delta integer,
  p_type text,
  p_source_type text default null,
  p_source_id text default null,
  p_notes text default null,
  p_created_by uuid default null
) returns public.stock_movements as $$
declare
  v_before integer;
  v_after integer;
  v_threshold integer;
  v_movement public.stock_movements;
begin
  -- Lock item row for update to ensure atomicity
  select quantity_on_hand, reorder_threshold
    into v_before, v_threshold
  from public.inventory_items
  where id = p_item_id
  for update;

  if v_before is null then
    raise exception 'Inventory item % not found', p_item_id;
  end if;

  v_after := v_before + p_delta;
  if v_after < 0 then
    raise exception 'Stock cannot be negative (before %, delta %, after %)', v_before, p_delta, v_after;
  end if;

  -- Write movement
  insert into public.stock_movements (
    item_id, type, quantity_change, before_qty, after_qty,
    source_type, source_id, notes, created_by
  ) values (
    p_item_id, p_type, p_delta, v_before, v_after,
    p_source_type, p_source_id, p_notes, coalesce(p_created_by, null)
  ) returning * into v_movement;

  -- Update item stock
  update public.inventory_items
  set quantity_on_hand = v_after,
      updated_at = now()
  where id = p_item_id;

  -- Insert low stock alert if needed and not already open
  if v_after <= v_threshold and v_threshold > 0 then
    insert into public.inventory_alerts (item_id, alert_type, current_qty, threshold)
    select p_item_id, 'low_stock', v_after, v_threshold
    where not exists (
      select 1 from public.inventory_alerts
      where item_id = p_item_id and alert_type = 'low_stock' and acknowledged = false
    );
  end if;

  return v_movement;
end;
$$ language plpgsql security definer;

-- Helpful views (optional)
create or replace view public.v_low_stock as
select i.*, (i.quantity_on_hand <= i.reorder_threshold) as is_low
from public.inventory_items i;